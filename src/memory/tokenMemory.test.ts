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

import { TokenMemory } from "@/memory/tokenMemory.js";
import { BAMLLM } from "@/adapters/bam/llm.js";
import { Client } from "@ibm-generative-ai/node-sdk";
import { BAMChatLLM } from "@/adapters/bam/chat.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import * as R from "remeda";
import { verifyDeserialization } from "@tests/e2e/utils.js";

describe("Token Memory", () => {
  beforeEach(() => {
    vi.stubEnv("GENAI_API_KEY", "123");
  });

  const getInstance = (config: {
    llmFactor: number;
    localFactor: number;
    syncThreshold: number;
    maxTokens: number;
  }) => {
    const llm = new BAMChatLLM({
      llm: new BAMLLM({
        client: new Client(),
        modelId: "google/flan-ul2",
      }),
      config: {
        messagesToPrompt: (messages) =>
          messages.map((msg) => `${msg.role}: ${msg.text}`).join("\n\n"),
      },
    });

    const estimateLLM = (msg: BaseMessage) => Math.ceil(msg.text.length * config.llmFactor);
    const estimateLocal = (msg: BaseMessage) => Math.ceil(msg.text.length * config.localFactor);

    vi.spyOn(llm, "tokenize").mockImplementation(async (messages: BaseMessage[]) => ({
      tokensCount: R.sum(messages.map(estimateLLM)),
    }));

    return new TokenMemory({
      llm,
      maxTokens: config.maxTokens,
      syncThreshold: config.syncThreshold,
      handlers: {
        estimate: estimateLocal,
      },
    });
  };

  it("Auto sync", async () => {
    const instance = getInstance({
      llmFactor: 2,
      localFactor: 1,
      maxTokens: 4,
      syncThreshold: 0.5,
    });
    await instance.addMany([
      BaseMessage.of({ role: Role.USER, text: "A" }),
      BaseMessage.of({ role: Role.USER, text: "B" }),
      BaseMessage.of({ role: Role.USER, text: "C" }),
      BaseMessage.of({ role: Role.USER, text: "D" }),
    ]);
    expect(instance.stats()).toMatchObject({
      isDirty: false,
      tokensUsed: 4,
      messagesCount: 2,
    });
  });

  it("Synchronizes", async () => {
    const instance = getInstance({
      llmFactor: 2,
      localFactor: 1,
      maxTokens: 10,
      syncThreshold: 1,
    });
    expect(instance.stats()).toMatchObject({
      isDirty: false,
      tokensUsed: 0,
      messagesCount: 0,
    });
    await instance.addMany([
      BaseMessage.of({ role: Role.USER, text: "A" }),
      BaseMessage.of({ role: Role.USER, text: "B" }),
      BaseMessage.of({ role: Role.USER, text: "C" }),
      BaseMessage.of({ role: Role.USER, text: "D" }),
      BaseMessage.of({ role: Role.USER, text: "E" }),
      BaseMessage.of({ role: Role.USER, text: "F" }),
    ]);
    expect(instance.stats()).toMatchObject({
      isDirty: true,
      tokensUsed: 6,
      messagesCount: 6,
    });
    await instance.sync();
    expect(instance.stats()).toMatchObject({
      isDirty: false,
      tokensUsed: 10,
      messagesCount: 5,
    });
  });

  it("Serializes", async () => {
    const instance = getInstance({
      llmFactor: 2,
      localFactor: 1,
      maxTokens: 10,
      syncThreshold: 1,
    });
    await instance.add(
      BaseMessage.of({
        text: "Hello!",
        role: Role.USER,
      }),
    );
    const serialized = instance.serialize();
    const deserialized = TokenMemory.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
