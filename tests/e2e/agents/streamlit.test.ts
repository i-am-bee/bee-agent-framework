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

import { FrameworkError } from "@/errors.js";
import { beforeEach, expect, vi } from "vitest";
import { UnconstrainedMemory } from "@/memory/unconstrainedMemory.js";
import { createCallbackRegister } from "@tests/e2e/utils.js";
import { createChatLLM } from "@tests/utils/llmFactory.js";
import { StreamlitAgent } from "@/agents/experimental/streamlit/agent.js";
import { BaseLLMOutput } from "@/llms/base.js";
import { BaseMemory } from "@/memory/base.js";
import { BaseMessage } from "@/llms/primitives/message.js";

describe("Streamlit Agent", () => {
  const createAgent = () => {
    return new StreamlitAgent({
      llm: createChatLLM(),
      memory: new UnconstrainedMemory(),
    });
  };

  beforeEach(() => {
    vi.useRealTimers();
  });

  it("Runs", async () => {
    const callbacks = createCallbackRegister();
    const agent = createAgent();

    let response: Awaited<ReturnType<typeof agent.run>>;
    try {
      response = await agent
        .run({
          prompt: `Generate a minimalistic "Hello World" app and provide some short explanation.`,
        })
        .observe((emitter) => {
          emitter.registerCallbacks({
            newToken: callbacks.create("newToken", {
              required: true,
              check: (value) => {
                expect(value).toBeTruthy();
                expect(value.delta).toBeTypeOf("string");
                expect(value.state).toBeTypeOf("object");
                expect(value.chunk).toBeInstanceOf(BaseLLMOutput);
              },
            }),
          });
        });
    } catch (e) {
      expect(e).toBeInstanceOf(FrameworkError);
      throw e;
    } finally {
      agent.destroy();
    }

    expect(response.memory).toBeInstanceOf(BaseMemory);
    expect(response.message).toBeInstanceOf(BaseMessage);

    expect(response.result.raw).toBeTypeOf("string");
    expect(response.result.blocks.length).toEqual(3);
    const [textStartBlock, appBlock, textEndBlock] = response.result.blocks;
    expect(textStartBlock.start).toBe(0);
    expect(textStartBlock.name).toBe("text");
    expect(textStartBlock.content).toBeTruthy();
    expect(appBlock.start).toBe(textStartBlock.end);
    expect(appBlock.name).toBe("app");
    expect(appBlock.content).toBeTruthy();
    expect(textEndBlock.start).toBe(appBlock.end);
    expect(textEndBlock.name).toBe("text");
    expect(textEndBlock.content).toBeTruthy();

    callbacks.verify();
  });
});
