/**
 * Copyright 2025 IBM Corp.
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

import { BeeAgent } from "@/agents/bee/agent.js";
import { Flow } from "@/experimental/flows/flow.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { AnyTool } from "@/tools/base.js";
import { AnyChatLLM } from "@/llms/chat.js";
import { BeeSystemPrompt } from "@/agents/bee/prompts.js";
import { ReadOnlyMemory } from "@/memory/base.js";
import { z } from "zod";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";

export class AgentFlow {
  protected readonly flow;

  static readonly schema = z.object({
    messages: z.array(z.instanceof(BaseMessage)).min(1),

    finalAnswer: z.string().optional(),
    newMessages: z.array(z.instanceof(BaseMessage)).default([]),
  });

  constructor(name = "AgentFlow") {
    this.flow = new Flow({
      name,
      schema: AgentFlow.schema,
      outputSchema: AgentFlow.schema.required(),
    });
  }

  addAgent(agent: { name: string; instructions?: string; tools: AnyTool[]; llm: AnyChatLLM }) {
    return this.addRawAgent(agent.name, (memory) => {
      return new BeeAgent({
        llm: agent.llm,
        tools: agent.tools,
        memory,
        meta: {
          name: agent.name,
          description: agent.instructions ?? "",
        },
        templates: {
          system: BeeSystemPrompt.fork((config) => ({
            ...config,
            defaults: {
              ...config.defaults,
              instructions: agent.instructions || config.defaults.instructions,
            },
          })),
        },
      });
    });
  }

  delAgent(name: string) {
    return this.flow.delStep(name);
  }

  addRawAgent(name: string, factory: (memory: ReadOnlyMemory) => BeeAgent) {
    this.flow.addStep(name, async (state, ctx) => {
      const memory = new UnconstrainedMemory();
      await memory.addMany([...state.messages, ...state.newMessages]);

      const agent = factory(memory.asReadOnly());
      const { result } = await agent.run({ prompt: null }, { signal: ctx.signal });

      return {
        update: {
          finalAnswer: result.text,
          newMessages: state.newMessages.concat(
            BaseMessage.of({
              ...result,
              text: [
                `Assistant Name: ${agent.meta.name}`,
                `Assistant Response: ${result.text}`,
              ].join("\n"),
            }),
          ),
        },
      };
    });
  }

  run(messages: BaseMessage[]) {
    return this.flow.run({
      messages,
    });
  }
}
