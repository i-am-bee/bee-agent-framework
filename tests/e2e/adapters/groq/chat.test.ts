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
import { GroqChatLLM } from "@/adapters/groq/chat.js";

const apiKey = process.env.GROQ_API_KEY;

describe.runIf(Boolean(apiKey))("Adapter Groq Chat LLM", () => {
  const createChatLLM = (modelId = "llama3-8b-8192") => {
    const model = new GroqChatLLM({
      modelId,
      parameters: {
        temperature: 0,
        max_tokens: 1024,
        top_p: 1,
      },
    });
    return new GroqChatLLM(model);
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
        question: `What is the coldest continent? Response must be a single word without any punctuation.`,
        answer: "Antarctica",
      },
      {
        question:
          "What is the most common typical animal that lives there? Response must be a single word without any punctuation.",
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

  // Embedding model does not available right now
  it.skip("Embeds", async () => {
    const llm = createChatLLM("nomic-embed-text-v1_5");
    const response = await llm.embed([
      [BaseMessage.of({ role: "user", text: `Hello world!` })],
      [BaseMessage.of({ role: "user", text: `Hello family!` })],
    ]);
    expect(response.embeddings.length).toBe(2);
    expect(response.embeddings[0].length).toBe(1024);
    expect(response.embeddings[1].length).toBe(1024);
  });
});
