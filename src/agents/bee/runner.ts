/**
 * Copyright 2024 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BeeAgentError } from "@/agents/bee/errors.js";

import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { BeeAgentRunIteration, BeeCallbacks, BeeMeta, BeeRunOptions } from "@/agents/bee/types.js";
import {
  AnyTool,
  BaseToolRunOptions,
  ToolError,
  ToolInputValidationError,
  ToolOutput,
} from "@/tools/base.js";
import { getProp } from "@/internals/helpers/object.js";
import { Retryable } from "@/internals/helpers/retryable.js";
import { FrameworkError } from "@/errors.js";
import { BeeInput } from "@/agents/bee/agent.js";
import { RetryCounter } from "@/internals/helpers/counter.js";
import {
  BeeSystemPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
  BeeToolNotFoundPrompt,
  BeeUserEmptyPrompt,
  BeeUserPrompt,
} from "@/agents/bee/prompts.js";
import { BeeIterationToolResult } from "@/agents/bee/parser.js";
import { AgentError } from "@/agents/base.js";
import { Emitter } from "@/emitter/emitter.js";
import { LinePrefixParser } from "@/agents/parsers/linePrefix.js";
import { JSONParserField, ZodParserField } from "@/agents/parsers/field.js";
import { z } from "zod";
import { Serializable } from "@/internals/serializable.js";
import { shallowCopy } from "@/serializer/utils.js";

export class BeeAgentRunnerFatalError extends BeeAgentError {
  isFatal = true;
}

export class BeeAgentRunner extends Serializable {
  protected readonly failedAttemptsCounter;

  constructor(
    protected readonly input: BeeInput,
    protected readonly options: BeeRunOptions,
    public readonly memory: TokenMemory,
  ) {
    super();
    this.failedAttemptsCounter = new RetryCounter(options?.execution?.totalMaxRetries, AgentError);
  }

  static {
    this.register();
  }

  static async create(input: BeeInput, options: BeeRunOptions, prompt: string | null) {
    const transformMessage = (message: BaseMessage) => {
      if (message.role === Role.USER) {
        const isEmpty = !message.text.trim();
        const text = isEmpty
          ? (input.templates?.userEmpty ?? BeeUserEmptyPrompt).render({})
          : (input.templates?.user ?? BeeUserPrompt).render({
              input: message.text,
              meta: {
                ...message?.meta,
                createdAt: message?.meta?.createdAt?.toISOString?.(),
              },
            });

        return BaseMessage.of({
          role: Role.USER,
          text,
          meta: message.meta,
        });
      }
      return message;
    };

    const memory = new TokenMemory({
      llm: input.llm,
      capacityThreshold: 0.85,
      syncThreshold: 0.5,
      handlers: {
        removalSelector(curMessages) {
          // First we remove messages from the past conversations
          const prevConversationMessage = curMessages.find((msg) =>
            input.memory.messages.includes(msg),
          );
          if (prevConversationMessage) {
            return prevConversationMessage;
          }

          if (curMessages.length <= 3) {
            throw new BeeAgentRunnerFatalError(
              "Cannot fit the current conversation into the context window!",
            );
          }

          const lastMessage =
            curMessages.find(
              (msg) => msg.role === Role.ASSISTANT && getProp(msg, ["ctx", "success"]) === false,
            ) ?? curMessages.find((msg) => msg.role === Role.ASSISTANT);

          if (!lastMessage) {
            throw new BeeAgentRunnerFatalError(
              "Cannot fit the current conversation into the context window!",
            );
          }
          return lastMessage;
        },
      },
    });

    await memory.addMany([
      BaseMessage.of({
        role: Role.SYSTEM,
        text: (input.templates?.system ?? BeeSystemPrompt).render({
          tools: await Promise.all(
            input.tools.map(async (tool) => ({
              name: tool.name,
              description: tool.description.replaceAll("\n", ".").replace(/\.$/, "").concat("."),
              schema: JSON.stringify(
                await tool.getInputJsonSchema(),
                (() => {
                  const ignoredKeys = new Set(["minLength", "maxLength", "$schema"]);
                  return (key, value) => (ignoredKeys.has(key) ? undefined : value);
                })(),
              ),
            })),
          ),
          instructions: undefined,
        }),
        meta: {
          createdAt: new Date(),
        },
      }),
      ...input.memory.messages.map(transformMessage),
    ]);

    if (prompt !== null || input.memory.isEmpty()) {
      await memory.add(
        transformMessage(
          BaseMessage.of({
            role: Role.USER,
            text: prompt ?? "",
            meta: {
              // TODO: createdAt
              createdAt: new Date(),
            },
          }),
        ),
      );
    }

    return new this(input, options, memory);
  }

  protected createParser(tools: AnyTool[]) {
    const parserRegex =
      /Thought:.+\n(?:Final Answer:[\S\s]+|Function Name:.+\nFunction Input: \{.*\}\nFunction Caption:.+\nFunction Output:)?/;

    const parser = new LinePrefixParser(
      {
        thought: {
          prefix: "Thought:",
          next: ["tool_name", "final_answer"],
          isStart: true,
          field: new ZodParserField(z.string().min(1)),
        },
        tool_name: {
          prefix: "Function Name:",
          next: ["tool_input"],
          field: new ZodParserField(
            z.pipeline(
              z.string().trim(),
              z.enum(tools.map((tool) => tool.name) as [string, ...string[]]),
            ),
          ),
        },
        tool_input: {
          prefix: "Function Input:",
          next: ["tool_caption", "tool_output"],
          isEnd: true,
          field: new JSONParserField({
            schema: z.object({}).passthrough(),
            base: {},
            matchPair: ["{", "}"],
          }),
        },
        tool_caption: {
          prefix: "Function Caption:",
          next: ["tool_output"],
          isEnd: true,
          field: new ZodParserField(z.string()),
        },
        tool_output: {
          prefix: "Function Output:",
          next: ["final_answer"],
          isEnd: true,
          field: new ZodParserField(z.string()),
        },
        final_answer: {
          prefix: "Final Answer:",
          next: [],
          isStart: true,
          isEnd: true,
          field: new ZodParserField(z.string().min(1)),
        },
      } as const,
      {
        waitForStartNode: true,
        endOnRepeat: true,
        fallback: (stash) =>
          stash
            ? [
                { key: "thought", value: "I now know the final answer." },
                { key: "final_answer", value: stash },
              ]
            : [],
      },
    );

    return {
      parser,
      parserRegex,
    } as const;
  }

  async llm(input: {
    emitter: Emitter<BeeCallbacks>;
    signal: AbortSignal;
    meta: BeeMeta;
  }): Promise<BeeAgentRunIteration> {
    const { emitter, signal, meta } = input;

    return new Retryable({
      onRetry: () => emitter.emit("retry", { meta }),
      onError: async (error) => {
        await emitter.emit("error", { error, meta });
        this.failedAttemptsCounter.use(error);
      },
      executor: async () => {
        await emitter.emit("start", { meta });

        const { parser, parserRegex } = this.createParser(this.input.tools);
        const llmOutput = await this.input.llm
          .generate(this.memory.messages.slice(), {
            signal,
            stream: true,
            guided: {
              regex: parserRegex.source,
            },
          })
          .observe((llmEmitter) => {
            parser.emitter.on("update", async ({ value, key, field }) => {
              if (key === "tool_output" && parser.isDone) {
                return;
              }
              await emitter.emit("update", {
                data: parser.finalState,
                update: { key, value: field.raw, parsedValue: value },
                meta: { success: true, ...meta },
              });
            });
            parser.emitter.on("partialUpdate", async ({ key, delta, value }) => {
              await emitter.emit("partialUpdate", {
                data: parser.finalState,
                update: { key, value: delta, parsedValue: value },
                meta: { success: true, ...meta },
              });
            });

            llmEmitter.on("newToken", async ({ value, callbacks }) => {
              if (parser.isDone) {
                callbacks.abort();
                return;
              }

              await parser.add(value.getTextContent());
              if (parser.partialState.tool_output !== undefined) {
                callbacks.abort();
              }
            });
          });

        await parser.end();

        return {
          state: parser.finalState,
          raw: llmOutput,
        };
      },
      config: {
        maxRetries: this.options.execution?.maxRetriesPerStep,
        signal,
      },
    }).get();
  }

  async tool(input: {
    iteration: BeeIterationToolResult;
    signal: AbortSignal;
    emitter: Emitter<BeeCallbacks>;
    meta: BeeMeta;
  }): Promise<{ output: string; success: boolean }> {
    const { iteration, signal, emitter, meta } = input;

    const tool = this.input.tools.find(
      (tool) => tool.name.trim().toUpperCase() == iteration.tool_name?.toUpperCase(),
    );
    if (!tool) {
      this.failedAttemptsCounter.use(
        new AgentError(`Agent was trying to use non-existing tool "${iteration.tool_name}"`, [], {
          context: { iteration, meta },
        }),
      );

      const template = this.input.templates?.toolNotFoundError ?? BeeToolNotFoundPrompt;
      return {
        success: false,
        output: template.render({
          tools: this.input.tools,
        }),
      };
    }
    const options = await (async () => {
      const baseOptions: BaseToolRunOptions = {
        signal,
      };
      const customOptions = await this.options.modifiers?.getToolRunOptions?.({
        tool,
        input: iteration.tool_input,
        baseOptions,
      });
      return customOptions ?? baseOptions;
    })();

    return new Retryable({
      config: {
        signal,
        maxRetries: this.options.execution?.maxRetriesPerStep,
      },
      onError: async (error) => {
        await emitter.emit("toolError", {
          data: {
            iteration,
            tool,
            input: iteration.tool_input,
            options,
            error: FrameworkError.ensure(error),
          },
          meta,
        });
        this.failedAttemptsCounter.use(error);
      },
      executor: async () => {
        try {
          await emitter.emit("toolStart", {
            data: {
              tool,
              input: iteration.tool_input,
              options,
              iteration,
            },
            meta,
          });
          const toolOutput: ToolOutput = await tool.run(iteration.tool_input, options);
          await emitter.emit("toolSuccess", {
            data: {
              tool,
              input: iteration.tool_input,
              options,
              result: toolOutput,
              iteration,
            },
            meta,
          });

          if (toolOutput.isEmpty()) {
            const template = this.input.templates?.toolNoResultError ?? BeeToolNoResultsPrompt;
            return { output: template.render({}), success: true };
          }

          return {
            success: true,
            output: toolOutput.getTextContent(),
          };
        } catch (error) {
          await emitter.emit("toolError", {
            data: {
              tool,
              input: iteration.tool_input,
              options,
              error,
              iteration,
            },
            meta,
          });

          if (error instanceof ToolInputValidationError) {
            this.failedAttemptsCounter.use(error);

            const template = this.input.templates?.toolInputError ?? BeeToolInputErrorPrompt;
            return {
              success: false,
              output: template.render({
                reason: error.toString(),
              }),
            };
          }

          if (error instanceof ToolError) {
            this.failedAttemptsCounter.use(error);

            const template = this.input.templates?.toolError ?? BeeToolErrorPrompt;
            return {
              success: false,
              output: template.render({
                reason: error.explain(),
              }),
            };
          }

          throw error;
        }
      },
    }).get();
  }

  createSnapshot() {
    return {
      input: shallowCopy(this.input),
      options: shallowCopy(this.options),
      memory: this.memory,
      failedAttemptsCounter: this.failedAttemptsCounter,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
