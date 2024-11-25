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

import { BaseAgent, BaseAgentRunOptions } from "@/agents/base.js";
import { AgentMeta } from "@/agents/types.js";
import { GetRunContext } from "@/context.js";
import { Callback, Emitter } from "@/emitter/emitter.js";
import { BaseMemory } from "@/memory/base.js";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import { isTruthy, last } from "remeda";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import {
  StreamlitAgentSystemPrompt,
  StreamlitAgentTemplates,
} from "@/agents/experimental/streamlit/prompts.js";
import { BaseLLMOutput } from "@/llms/base.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { findFirstPair } from "@/internals/helpers/string.js";
import { BeeAgentRunnerFatalError } from "@/agents/bee/runner.js";

export interface StreamlitAgentInput {
  llm: ChatLLM<ChatLLMOutput>;
  memory: BaseMemory;
  templates?: Partial<StreamlitAgentTemplates>;
}

export interface StreamlitRunInput {
  prompt: string | null;
}

interface Options extends BaseAgentRunOptions {}

interface Block {
  name: "text" | "app";
  content: string;
  start: number;
  end: number;
}

interface Result {
  raw: string;
  blocks: Block[];
}

export interface StreamlitRunOutput {
  result: Result;
  message: BaseMessage;
  memory: BaseMemory;
}

export interface StreamlitEvents {
  newToken: Callback<{
    delta: string;
    state: Readonly<{
      content: string;
    }>;
    chunk: BaseLLMOutput;
  }>;
}

export class StreamlitAgent extends BaseAgent<StreamlitRunInput, StreamlitRunOutput, Options> {
  public emitter = new Emitter<StreamlitEvents>({
    namespace: ["agent", "experimental", "streamlit"],
    creator: this,
  });

  constructor(protected readonly input: StreamlitAgentInput) {
    super();
  }

  public get meta(): AgentMeta {
    return {
      name: `Streamlit`,
      tools: [],
      description: `StreamlitAgent is an experimental meta-app agent that uses \`Meta LLaMa 3.1 70B\` to build \`IBM Granite 3 8B\`-powered apps using Streamlit -- a simple UI framework for Python.`,
    };
  }

  public get memory() {
    return this.input.memory;
  }

  protected async _run(
    input: StreamlitRunInput,
    _options: Options | undefined,
    run: GetRunContext<typeof this>,
  ): Promise<StreamlitRunOutput> {
    const { userMessage, runMemory } = await this.prepare(input);

    let content = "";
    for await (const chunk of this.input.llm.stream(runMemory.messages, {
      signal: run.signal,
    })) {
      const delta = chunk.getTextContent();
      content += delta;
      await run.emitter.emit("newToken", { delta, state: { content }, chunk });
    }
    const result = this.parse(content);

    const assistantMessage = BaseMessage.of({
      role: Role.ASSISTANT,
      text: content,
    });
    await this.memory.addMany([userMessage, assistantMessage].filter(isTruthy));

    return {
      result,
      message: assistantMessage,
      memory: runMemory,
    };
  }

  protected async prepare(input: StreamlitRunInput) {
    const systemMessage = BaseMessage.of({
      role: Role.SYSTEM,
      text: (this.input.templates?.system ?? StreamlitAgentSystemPrompt).render({}),
    });

    const userMessage =
      input.prompt !== null || this.memory.isEmpty()
        ? BaseMessage.of({
            role: Role.USER,
            text: input.prompt ?? "No message.",
            meta: {
              createdAt: new Date(),
            },
          })
        : null;

    const inputMessages = [...this.memory.messages, userMessage].filter(isTruthy);

    const runMemory = new TokenMemory({
      llm: this.input.llm,
      capacityThreshold: 0.85,
      syncThreshold: 0.6,
      handlers: {
        removalSelector(msgs) {
          // First we remove messages from the past conversations
          const prevConversationMsg = msgs.find((msg) => inputMessages.includes(msg));
          if (prevConversationMsg && prevConversationMsg !== last(inputMessages)) {
            return prevConversationMsg;
          }

          const lastMsg = msgs.length > 3 && msgs.find((m) => m.role === Role.ASSISTANT);
          if (!lastMsg) {
            throw new BeeAgentRunnerFatalError(
              "Cannot fit the current conversation into the context window!",
            );
          }
          return lastMsg;
        },
      },
    });
    await runMemory.addMany([systemMessage, ...inputMessages].filter(isTruthy));

    return { runMemory, userMessage };
  }

  protected parse(raw: string): Result {
    const blocks: Block[] = [];

    for (let i = 0; i < raw.length; ) {
      const text = raw.substring(i);

      const code = findFirstPair(text, ["```python-app\n", "```\n"]);
      if (!code) {
        blocks.push({ start: i, end: i + text.length, content: text, name: "text" });
        break;
      }

      if (code.start > 0) {
        blocks.push({
          name: "text",
          start: i,
          end: i + code.start,
          content: text.substring(0, code.start),
        });
      }
      blocks.push({
        name: "app",
        content: code.inner,
        start: i + code.start,
        end: i + code.end,
      });
      i += code.end;
    }

    return {
      raw,
      blocks,
    };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      input: this.input,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
