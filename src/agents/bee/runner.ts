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
import { PromptTemplate } from "@/template.js";
import { BeeAgentRunIteration, BeeCallbacks, BeeMeta, BeeRunOptions } from "@/agents/bee/types.js";
import { BaseToolRunOptions, ToolInputValidationError, ToolOutput } from "@/tools/base.js";
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
  BeeUserPrompt,
} from "@/agents/bee/prompts.js";
import { BeeIterationToolResult, BeeOutputParser } from "@/agents/bee/parser.js";
import { AgentError } from "@/agents/base.js";
import { Emitter } from "@/emitter/emitter.js";

export class BeeAgentRunnerFatalError extends BeeAgentError {
  isFatal = true;
}

export class BeeAgentRunner {
  protected readonly failedAttemptsCounter;

  constructor(
    protected readonly input: BeeInput,
    protected readonly options: BeeRunOptions,
    public readonly memory: TokenMemory,
  ) {
    this.failedAttemptsCounter = new RetryCounter(options?.execution?.totalMaxRetries, AgentError);
  }

  static async create(input: BeeInput, options: BeeRunOptions, prompt: string) {
    const memory = new TokenMemory({
      llm: input.llm,
      capacityThreshold: 0.85,
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
              schema: JSON.stringify(await tool.getInputJsonSchema()),
            })),
          ),
          tool_names: input.tools.map((tool) => tool.name).join(","),
          instructions: PromptTemplate.defaultPlaceholder,
        }),
      }),
      ...input.memory.messages,
      BaseMessage.of({
        role: Role.USER,
        text: (input.templates?.user ?? BeeUserPrompt).render({
          input: prompt.trim() ? prompt : "Empty message.",
        }),
      }),
    ]);

    return new BeeAgentRunner(input, options, memory);
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

        const outputParser = new BeeOutputParser();
        const llmOutput = await this.input.llm
          .generate(this.memory.messages.slice(), {
            signal,
            stream: true,
            guided: {
              regex:
                /Thought:.+\n(?:Final Answer:[\S\s]+|Tool Name:.+\nTool Caption:.+\nTool Input:\{.+\}\nTool Output:)/
                  .source,
            },
          })
          .observe((llmEmitter) => {
            outputParser.emitter.on("update", async ({ type, update, state }) => {
              await emitter.emit(type === "full" ? "update" : "partialUpdate", {
                data: state,
                update,
                meta: { success: true, ...meta },
              });
            });

            llmEmitter.on("newToken", async ({ value, callbacks }) => {
              if (outputParser.isDone) {
                callbacks.abort();
                return;
              }

              await outputParser.add(value.getTextContent());
              if (outputParser.stash.match(/^\s*Tool Output:/i)) {
                outputParser.stash = "";
                callbacks.abort();
              }
            });
          });

        await outputParser.finalize();
        outputParser.validate();

        return {
          state: outputParser.parse(),
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
        await emitter.emit("toolStart", {
          data: {
            tool,
            input: iteration.tool_input,
            options,
            iteration,
          },
          meta,
        });

        try {
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

          if (FrameworkError.isRetryable(error)) {
            this.failedAttemptsCounter.use(error);

            const template = this.input.templates?.toolError ?? BeeToolErrorPrompt;
            return {
              success: false,
              output: template.render({
                reason: FrameworkError.ensure(error).explain(),
              }),
            };
          }

          throw error;
        }
      },
    }).get();
  }
}
