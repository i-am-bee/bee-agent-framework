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

import { BaseAgent } from "@/agents/base.js";
import { AnyTool } from "@/tools/base.js";
import { BaseMemory } from "@/memory/base.js";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { AgentMeta } from "@/agents/types.js";
import { BeeAssistantPrompt } from "@/agents/bee/prompts.js";
import * as R from "remeda";
import { Emitter } from "@/emitter/emitter.js";
import {
  BeeAgentRunIteration,
  BeeAgentTemplates,
  BeeCallbacks,
  BeeMeta,
  BeeRunInput,
  BeeRunOptions,
  BeeRunOutput,
} from "@/agents/bee/types.js";
import { GetRunContext } from "@/context.js";
import { BeeAgentError } from "@/agents/bee/errors.js";
import { BeeIterationToolResult } from "@/agents/bee/parser.js";
import { assign } from "@/internals/helpers/object.js";
import { BeeAgentRunner } from "@/agents/bee/runner.js";

export interface BeeInput {
  llm: ChatLLM<ChatLLMOutput>;
  tools: AnyTool[];
  memory: BaseMemory;
  meta?: Omit<AgentMeta, "tools">;
  templates?: Partial<BeeAgentTemplates>;
}

export class BeeAgent extends BaseAgent<BeeRunInput, BeeRunOutput, BeeRunOptions> {
  public readonly emitter = Emitter.root.child<BeeCallbacks>({
    namespace: ["agent", "bee"],
    creator: this,
  });

  protected runner: typeof BeeAgentRunner = BeeAgentRunner;

  constructor(protected readonly input: BeeInput) {
    super();

    const duplicate = input.tools.find((a, i, arr) =>
      arr.find((b, j) => i !== j && a.name.toUpperCase() === b.name.toUpperCase()),
    );
    if (duplicate) {
      throw new BeeAgentError(
        `Agent's tools must all have different names. Conflicting tool: ${duplicate.name}.`,
      );
    }
  }

  static {
    this.register();
  }

  get memory() {
    return this.input.memory;
  }

  get meta(): AgentMeta {
    const tools = this.input.tools.slice();

    if (this.input.meta) {
      return { ...this.input.meta, tools };
    }

    return {
      name: "Bee",
      tools,
      description:
        "The Bee framework demonstrates its ability to auto-correct and adapt in real-time, improving the overall reliability and resilience of the system.",
      ...(tools.length > 0 && {
        extraDescription: [
          `Tools that I can use to accomplish given task.`,
          ...tools.map((tool) => `Tool '${tool.name}': ${tool.description}.`),
        ].join("\n"),
      }),
    };
  }

  protected async _run(
    input: BeeRunInput,
    options: BeeRunOptions = {},
    run: GetRunContext<typeof this>,
  ): Promise<BeeRunOutput> {
    const iterations: BeeAgentRunIteration[] = [];
    const maxIterations = options?.execution?.maxIterations ?? Infinity;

    const runner = await this.runner.create(this.input, options, input.prompt);

    let finalMessage: BaseMessage | undefined;
    while (!finalMessage) {
      const meta: BeeMeta = { iteration: iterations.length + 1 };
      if (meta.iteration > maxIterations) {
        throw new BeeAgentError(
          `Agent was not able to resolve the task in ${maxIterations} iterations.`,
          [],
          { isFatal: true },
        );
      }

      const emitter = run.emitter.child({ groupId: `iteration-${meta.iteration}` });
      const iteration = await runner.llm({ emitter, signal: run.signal, meta });

      if (iteration.state.tool_name || iteration.state.tool_caption || iteration.state.tool_input) {
        const { output, success } = await runner.tool({
          iteration: iteration.state as BeeIterationToolResult,
          signal: run.signal,
          emitter,
          meta,
        });

        for (const key of ["partialUpdate", "update"] as const) {
          await emitter.emit(key, {
            data: {
              ...iteration.state,
              tool_output: output,
            },
            update: { key: "tool_output", value: output, parsedValue: output },
            meta: { success, ...meta },
          });
        }

        await runner.memory.add(
          BaseMessage.of({
            role: Role.ASSISTANT,
            text: BeeAssistantPrompt.clone().render({
              toolName: [iteration.state.tool_name].filter(R.isTruthy),
              toolCaption: [iteration.state.tool_caption].filter(R.isTruthy),
              toolInput: [iteration.state.tool_input]
                .filter(R.isTruthy)
                .map((call) => JSON.stringify(call)),
              thought: [iteration.state.thought].filter(R.isTruthy),
              finalAnswer: [iteration.state.final_answer].filter(R.isTruthy),
              toolOutput: [output],
            }),
            meta: { success },
          }),
        );

        assign(iteration.state, { tool_output: output });
      }
      if (iteration.state.final_answer) {
        finalMessage = BaseMessage.of({
          role: Role.ASSISTANT,
          text: iteration.state.final_answer,
          meta: {
            createdAt: new Date(),
          },
        });
        await run.emitter.emit("success", {
          data: finalMessage,
          iterations,
          memory: runner.memory,
          meta,
        });
        await runner.memory.add(finalMessage);
      }
      iterations.push(iteration);
    }

    if (input.prompt !== null) {
      await this.input.memory.add(
        BaseMessage.of({
          role: Role.USER,
          text: input.prompt,
          meta: {
            createdAt: run.createdAt,
          },
        }),
      );
    }
    await this.input.memory.add(finalMessage);

    return { result: finalMessage, iterations, memory: runner.memory };
  }

  createSnapshot() {
    return {
      input: this.input,
      emitter: this.emitter,
      runner: this.runner,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
