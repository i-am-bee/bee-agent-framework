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
import { ChatOpenAI } from "@langchain/openai";
import { LangChainChatLLM } from "@/adapters/langchain/llms/chat.js";

const apiKey = process.env.OPENAI_API_KEY;

describe.runIf(Boolean(apiKey))("Adapter LangChain Chat LLM", () => {
  const createChatLLM = () => {
    const model = new ChatOpenAI({
      temperature: 0,
      apiKey,
    });
    return new LangChainChatLLM(model);
  };

  it("Generates", async () => {
    const conversation = [
      BaseMessage.of({
        role: Role.SYSTEM,
        text: `You are a helpful and respectful and honest assistant. Your answer should be short and concise.`,
      }),
    ];
    const llm = createChatLLM();

    for (const { question, answer } of [
      {
        question: `What is the coldest continent? Response must be a single word.`,
        answer: "Antarctica",
      },
      {
        question:
          "What is the most common typical animal that lives there? Response must be a single word.",
        answer: "Penguin",
      },
    ]) {
      conversation.push(
        BaseMessage.of({
          role: Role.USER,
          text: question,
        }),
      );
      const response = await llm.generate(conversation);
      expect(response.messages.length).toBeGreaterThan(0);
      expect(response.getTextContent()).toBe(answer);
      conversation.push(
        BaseMessage.of({
          role: Role.ASSISTANT,
          text: response.getTextContent(),
        }),
      );
    }
  });
});
