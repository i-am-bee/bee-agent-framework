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

import { PromptTemplate } from "@/template.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { expect } from "vitest";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { WatsonXChatLLM } from "@/adapters/watsonx/chat.js";
import { WatsonXLLM } from "@/adapters/watsonx/llm.js";

const apiKey = process.env.WATSONX_API_KEY!;
const projectId = process.env.WATSONX_PROJECT_ID!;

describe.runIf(Boolean(apiKey && projectId))("WatsonX Chat LLM", () => {
  const createChatLLM = () => {
    const template = new PromptTemplate({
      variables: ["messages"],
      template: `{{#messages}}{{#system}}<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{{system}}<|eot_id|>{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>

{{user}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>

{{assistant}}<|eot_id|>{{/assistant}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>

`,
    });

    return new WatsonXChatLLM({
      llm: new WatsonXLLM({
        modelId: "meta-llama/llama-3-70b-instruct",
        projectId,
        apiKey,
        parameters: {
          decoding_method: "greedy",
          min_new_tokens: 5,
          max_new_tokens: 50,
        },
      }),
      config: {
        messagesToPrompt(messages: BaseMessage[]) {
          return template.render({
            messages: messages.map((message) => ({
              system: message.role === "system" ? [message.text] : [],
              user: message.role === "user" ? [message.text] : [],
              assistant: message.role === "assistant" ? [message.text] : [],
            })),
          });
        },
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
