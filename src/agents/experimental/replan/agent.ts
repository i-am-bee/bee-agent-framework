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

import { Callback } from "@/emitter/types.js";
import { Emitter } from "@/emitter/emitter.js";
import { AgentError, BaseAgent, BaseAgentRunOptions } from "@/agents/base.js";
import { GetRunContext } from "@/context.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import {
  createRePlanOutputSchema,
  RePlanState,
  RePlanSystemPrompt,
  RePlanAssistantPrompt,
} from "@/agents/experimental/replan/prompts.js";
import { BaseMemory } from "@/memory/base.js";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { JsonDriver } from "@/llms/drivers/json.js";
import { AnyTool, Tool } from "@/tools/base.js";
import { AnyChatLLM } from "@/llms/chat.js";

export interface RePlanRunInput {
  prompt: string | null;
}

export interface RePlanRunOutput {
  message: BaseMessage;
  intermediateMemory: BaseMemory;
}

export interface RePlanToolCall {
  name: string;
  input: any;
}

export interface RePlanEvents {
  update: Callback<{ state: RePlanState }>;
  tool: Callback<
    | { type: "start"; tool: AnyTool; input: any; calls: RePlanToolCall[] }
    | { type: "success"; tool: AnyTool; input: any; output: any; calls: RePlanToolCall[] }
    | { type: "error"; tool: AnyTool; input: any; error: Error; calls: RePlanToolCall[] }
  >;
}

interface Input {
  memory: BaseMemory;
  tools: AnyTool[];
  llm: AnyChatLLM;
}

export class RePlanAgent extends BaseAgent<RePlanRunInput, RePlanRunOutput> {
  public emitter = Emitter.root.child<RePlanEvents>({
    namespace: ["agent", "rePlan"],
    creator: this,
  });

  constructor(protected readonly input: Input) {
    super();
  }

  protected async _run(
    input: RePlanRunInput,
    _options: BaseAgentRunOptions,
    context: GetRunContext<this>,
  ): Promise<RePlanRunOutput> {
    if (input.prompt !== null) {
      await this.memory.add(
        BaseMessage.of({
          role: Role.USER,
          text: input.prompt,
        }),
      );
    }

    const runner = await this.createRunner(context);

    let finalMessage: BaseMessage | undefined = undefined;
    while (!finalMessage) {
      const state = await runner.run();

      if (state.nextStep.type === "message") {
        finalMessage = BaseMessage.of({
          role: Role.USER,
          text: state.nextStep.message,
        });
      } else if (state.nextStep.type === "tool") {
        const toolResults = await runner.tools(state.nextStep.calls);
        await runner.memory.add(
          BaseMessage.of({
            role: Role.ASSISTANT,
            text: RePlanAssistantPrompt.render({
              results: JSON.stringify(toolResults),
            }),
          }),
        );
      }
    }

    await this.memory.add(finalMessage);

    return {
      message: finalMessage,
      intermediateMemory: runner.memory,
    };
  }

  protected async createRunner(context: GetRunContext<this>) {
    const memory = new UnconstrainedMemory();
    await memory.addMany(this.memory.messages);

    const run = async (): Promise<RePlanState> => {
      const driver = JsonDriver.fromTemplate(RePlanSystemPrompt, this.input.llm);
      const schema = await createRePlanOutputSchema(this.input.tools);
      const response = await driver.generate<RePlanState>(schema.json, memory.messages, {
        options: { signal: context.signal },
      });
      await memory.add(
        BaseMessage.of({
          role: Role.ASSISTANT,
          text: response.raw.getTextContent(),
        }),
      );
      await context.emitter.emit("update", { state: response.parsed });
      return response.parsed;
    };

    const tools = async (calls: RePlanToolCall[]) => {
      return await Promise.all(
        calls.map(async (call) => {
          const tool = this.input.tools.find((tool) => tool.name === call.name);
          if (!tool) {
            throw new AgentError(`Tool ${call.name} does not exist.`);
          }

          const meta = { input: call, tool, calls };
          await context.emitter.emit("tool", { type: "start", ...meta });
          try {
            const output = await tool.run(call.input, { signal: context.signal }).context({
              [Tool.contextKeys.Memory]: memory,
            });
            await context.emitter.emit("tool", { type: "success", ...meta, output });
            return output;
          } catch (error) {
            await context.emitter.emit("tool", { type: "error", ...meta, error });
            throw error;
          }
        }),
      );
    };

    return {
      memory,
      run,
      tools,
    };
  }

  get memory() {
    return this.input.memory;
  }
}
