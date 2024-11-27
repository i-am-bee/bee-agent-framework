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

import { BaseMessage, Role } from "@/llms/primitives/message.js";
import type { AnyTool } from "@/tools/base.js";
import { isEmpty } from "remeda";
import { DefaultRunner } from "@/agents/bee/runners/default/runner.js";
import { BaseMemory } from "@/memory/base.js";
import type { BeeParserInput, BeeRunInput, BeeRunOptions } from "@/agents/bee/types.js";
import { BeeAgent, BeeInput } from "@/agents/bee/agent.js";
import type { GetRunContext } from "@/context.js";
import {
  BeeSystemPrompt,
  BeeToolNotFoundPrompt,
  BeeToolErrorPrompt,
  BeeToolInputErrorPrompt,
  BeeToolNoResultsPrompt,
} from "@/agents/bee/prompts.js";

export class HumanToolRunner extends DefaultRunner {
  static {
    this.register();
  }

  constructor(input: BeeInput, options: BeeRunOptions, run: GetRunContext<BeeAgent>) {
    super(input, options, run);

    run.emitter.on(
      "update",
      async ({ update, meta, memory }) => {
        if (update.key === "tool_output") {
          await memory.add(
            BaseMessage.of({
              role: "tool_response",
              text: update.value,
              meta: { success: meta.success },
            }),
          );
        }
      },
      {
        isBlocking: true,
      },
    );
  }

  async tool({ state, signal, meta }: { state: any; signal: AbortSignal; meta: any }) {
    if (state.tool_name === "HumanTool") {
      const humanTool = new (await import("@/tools/human.js")).HumanTool();

      const humanToolInput = {
        message:
          typeof state.tool_input === "string"
            ? state.tool_input
            : (state.tool_input as Record<string, any>).message ||
              JSON.stringify(state.tool_input),
      };

      return new Retryable({
        config: {
          signal,
          maxRetries: this.options.execution?.maxRetriesPerStep,
        },
        onError: async (error) => {
          await this.run.emitter.emit("toolError", {
            data: {
              tool: humanTool,
              input: humanToolInput,
              options: this.options,
              error,
              iteration: state,
            },
            meta,
          });

          if (error instanceof ToolInputValidationError) {
            const template = this.input.templates?.toolInputError ?? BeeToolInputErrorPrompt;
            return {
              success: false,
              output: template.render({
                reason: error.toString(),
              }),
            };
          }

          if (error instanceof ToolError) {
            const template = this.input.templates?.toolError ?? BeeToolErrorPrompt;
            return {
              success: false,
              output: template.render({
                reason: error.explain(),
              }),
            };
          }

          throw error;
        },
        executor: async () => {
          await this.run.emitter.emit("toolStart", {
            data: {
              tool: humanTool,
              input: humanToolInput,
              options: this.options,
              iteration: state,
            },
            meta,
          });

          const toolOutput = await humanTool.run(humanToolInput, this.options);

          if (toolOutput.isEmpty()) {
            const template = this.input.templates?.toolNoResultError ?? BeeToolNoResultsPrompt;
            return { output: template.render({}), success: true };
          }

          return {
            success: true,
            output: toolOutput.getTextContent(),
          };
        },
      }).get();
    }

    return super.tool({ state, signal, meta });
  }

  protected createParser(tools: AnyTool[]) {
    const { parser } = super.createParser(tools);

    return {
      parserRegex: isEmpty(tools)
        ? new RegExp(`Thought:.+\\nFinal Answer:[\\s\\S]+`)
        : new RegExp(
            `Thought:.+\\n(?:Final Answer:[\\s\\S]+|Function Name:(${tools.map((tool) => tool.name).join("|")}|HumanTool)\\nFunction Input: \\{.*\\}\\nFunction Output:)?`,
          ),
      parser: parser.fork<BeeParserInput>((nodes, options) => ({
        options,
        nodes: {
          ...nodes,
          thought: { ...nodes.thought, prefix: "Thought:" },
          tool_name: { ...nodes.tool_name, prefix: "Function Name:" },
          tool_input: { ...nodes.tool_input, prefix: "Function Input:", isEnd: true, next: [] },
          final_answer: { ...nodes.final_answer, prefix: "Final Answer:" },
        },
      })),
    };
  }
}
