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

import { BaseMessage } from "@/llms/primitives/message.js";
import { expect } from "vitest";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { WatsonXChatLLM } from "@/adapters/watsonx/chat.js";

const apiKey = process.env.WATSONX_API_KEY!;
const projectId = process.env.WATSONX_PROJECT_ID!;

describe.runIf(Boolean(apiKey && projectId))("WatsonX Chat LLM", () => {
  const createChatLLM = () => {
    return WatsonXChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct", {
      apiKey,
      projectId,
      parameters: {
        decoding_method: "greedy",
        min_new_tokens: 5,
        max_new_tokens: 50,
      },
    });
  };

  it("Generates", async () => {
    const conversation = [
      BaseMessage.of({
        role: "system",
        text: `You are a helpful and respectful and honest assistant. Your answer should be short and concise.`,
      }),
    ];
    const llm = createChatLLM();

    for (const { question, answer } of [
      { question: `What is the coldest continent?`, answer: "arctica" },
      { question: "What is the most common typical animal that lives there?", answer: "penguin" },
    ]) {
      conversation.push(
        BaseMessage.of({
          role: "user",
          text: question,
        }),
      );
      const response = await llm.generate(conversation);

      const newMessages = response.messages;
      expect(newMessages).toHaveLength(1);
      expect(newMessages[0].text.toLowerCase()).toContain(answer.toLowerCase());
      conversation.push(...newMessages);
    }
  });

  it("Serializes", () => {
    const llm = createChatLLM();
    const serialized = llm.serialize();
    const deserialized = WatsonXChatLLM.fromSerialized(serialized);
    verifyDeserialization(llm, deserialized);
  });
});
