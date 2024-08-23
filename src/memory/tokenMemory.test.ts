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
  const getInstance = () => {
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

    vi.spyOn(llm, "tokenize").mockImplementation(async (messages: BaseMessage[]) => ({
      tokensCount: R.sum(messages.map((msg) => [msg.role, msg.text].join("").length)),
    }));

    return new TokenMemory({
      llm,
      maxTokens: 1000,
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    await instance.add(
      BaseMessage.of({
        text: "I am a Batman!",
        role: Role.USER,
      }),
    );
    const serialized = instance.serialize();
    const deserialized = TokenMemory.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
