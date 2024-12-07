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
import { BaseRunner, BeeRunnerLLMInput, BeeRunnerToolInput } from "@/agents/bee/runners/base.js";
import { BeeAgentRunIteration, BeeParserInput, BeeRunInput } from "@/agents/bee/types.js";
import { Retryable } from "@/internals/helpers/retryable.js";
import { AgentError } from "@/agents/base.js";
import {
  BeeSchemaErrorPrompt,
  BeeSystemPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
  BeeToolNotFoundPrompt,
  BeeUserEmptyPrompt,
  BeeUserPrompt,
} from "@/agents/bee/prompts.js";
import { AnyTool, ToolError, ToolInputValidationError, ToolOutput } from "@/tools/base.js";
import { FrameworkError } from "@/errors.js";
import { isEmpty, isTruthy, last } from "remeda";
import { LinePrefixParser, LinePrefixParserError } from "@/agents/parsers/linePrefix.js";
import { JSONParserField, ZodParserField } from "@/agents/parsers/field.js";
import { z } from "zod";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { getProp } from "@/internals/helpers/object.js";
import { BaseMemory } from "@/memory/base.js";
import { Cache } from "@/cache/decoratorCache.js";

export class DefaultRunner extends BaseRunner {
  static {
    this.register();
  }

  async llm({ signal, meta, emitter }: BeeRunnerLLMInput): Promise<BeeAgentRunIteration> {
    const tempMessageKey = "tempMessage" as const;

    return new Retryable({
      onRetry: () => emitter.emit("retry", { meta }),
      onError: async (error) => {
        await emitter.emit("error", { error, meta });
        this.failedAttemptsCounter.use(error);

        if (error instanceof LinePrefixParserError) {
          // Prevent hanging on EOT
          if (error.reason === LinePrefixParserError.Reason.NoDataReceived) {
            await this.memory.add(
              BaseMessage.of({
                role: Role.ASSISTANT,
                text: "\n",
                meta: {
                  [tempMessageKey]: true,
                },
              }),
            );
          } else {
            await this.memory.add(
              BaseMessage.of({
                role: Role.ASSISTANT,
                text: (this.input.templates?.schemaError ?? BeeSchemaErrorPrompt).render({}),
                meta: {
                  [tempMessageKey]: true,
                },
              }),
            );
          }
        }
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
                memory: this.memory,
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
        await this.memory.deleteMany(
          this.memory.messages.filter((msg) => getProp(msg.meta, [tempMessageKey]) === true),
        );

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

  async tool({ state, signal, meta, emitter }: BeeRunnerToolInput) {
    const tool = this.input.tools.find(
      (tool) => tool.name.trim().toUpperCase() == state.tool_name?.trim()?.toUpperCase(),
    );
    if (!tool) {
      this.failedAttemptsCounter.use(
        new AgentError(`Agent was trying to use non-existing tool "${state.tool_name}"`, [], {
          context: { state, meta },
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

    return new Retryable({
      config: {
        signal,
        maxRetries: this.options.execution?.maxRetriesPerStep,
      },
      onError: async (error) => {
        await emitter.emit("toolError", {
          data: {
            iteration: state,
            tool,
            input: state.tool_input,
            options: this.options,
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
              input: state.tool_input,
              options: this.options,
              iteration: state,
            },
            meta,
          });
          const toolOutput: ToolOutput = await tool.run(state.tool_input, this.options);
          await emitter.emit("toolSuccess", {
            data: {
              tool,
              input: state.tool_input,
              options: this.options,
              result: toolOutput,
              iteration: state,
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
              input: state.tool_input,
              options: this.options,
              error,
              iteration: state,
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

  @Cache({ enumerable: false })
  protected get renderers() {
    const self = {
      user: {
        message: ({ prompt }: BeeRunInput) =>
          prompt !== null || this.input.memory.isEmpty()
            ? BaseMessage.of({
                role: Role.USER,
                text: prompt ?? "",
                meta: {
                  createdAt: new Date(),
                },
              })
            : undefined,
      },
      system: {
        variables: {
          tools: async () => {
            return await Promise.all(
              this.input.tools.map(async (tool) => ({
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
            );
          },
        },
        message: async () =>
          BaseMessage.of({
            role: Role.SYSTEM,
            text: (this.input.templates?.system ?? BeeSystemPrompt).render({
              tools: await self.system.variables.tools(),
              instructions: undefined,
            }),
            meta: {
              createdAt: new Date(),
            },
          }),
      },
    };
    return self;
  }

  protected async initMemory({ prompt }: BeeRunInput): Promise<BaseMemory> {
    const { templates, memory: history, llm } = this.input;

    const prevConversation = [...history.messages, this.renderers.user.message({ prompt })]
      .filter(isTruthy)
      .map((message) => {
        if (message.role === Role.USER) {
          const isEmpty = !message.text.trim();
          const text = isEmpty
            ? (templates?.userEmpty ?? BeeUserEmptyPrompt).render({})
            : (templates?.user ?? BeeUserPrompt).render({
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
      });

    const memory = new TokenMemory({
      llm,
      capacityThreshold: 0.85,
      syncThreshold: 0.5,
      handlers: {
        removalSelector(curMessages) {
          // First we remove messages from the past conversations
          const prevConversationMessage = curMessages.find((msg) => prevConversation.includes(msg));
          if (prevConversationMessage && prevConversationMessage !== last(prevConversation)) {
            return prevConversationMessage;
          }

          const lastMessage =
            curMessages.length > 3
              ? (curMessages.find(
                  (msg) =>
                    msg.role === Role.ASSISTANT && getProp(msg, ["ctx", "success"]) === false,
                ) ?? curMessages.find((msg) => msg.role === Role.ASSISTANT))
              : null;

          if (!lastMessage) {
            throw new AgentError("Cannot fit the current conversation into the context window!");
          }
          return lastMessage;
        },
      },
    });
    await memory.addMany([await this.renderers.system.message(), ...prevConversation]);
    return memory;
  }

  protected createParser(tools: AnyTool[]) {
    const parserRegex = isEmpty(tools)
      ? new RegExp(`Thought: .+\\nFinal Answer: [\\s\\S]+`)
      : new RegExp(
          `Thought: (?!.*Function Name:).+\\n(?:Final Answer: [\\s\\S]+|Function Name: (?:${tools.map((tool) => tool.name).join("|")})\\nFunction Input: \\{.*\\}\\nFunction Output:)`,
        );

    const parser = new LinePrefixParser<BeeParserInput>(
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
          next: ["tool_output"],
          isEnd: true,
          field: new JSONParserField({
            schema: z.object({}).passthrough(),
            base: {},
            matchPair: ["{", "}"],
          }),
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
      },
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
}
