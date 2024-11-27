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
import { VertexAIChatLLM } from "@/adapters/vertexai/chat.js";
import { getEnv } from "@/internals/env.js";

const project = getEnv("GCP_VERTEXAI_PROJECT");
const location = getEnv("GCP_VERTEXAI_LOCATION");

describe.runIf(Boolean(project && location && getEnv("GOOGLE_APPLICATION_CREDENTIALS")))(
  "GCP Vertex AI",
  () => {
    const createChatLLM = () => {
      return new VertexAIChatLLM({
        modelId: "gemini-1.5-flash-001",
        project: process.env.GCP_VERTEXAI_PROJECT ?? "dummy",
        location: "us-central1",
      });
    };

    it("Generates", async () => {
      const conversation = [
        BaseMessage.of({
          role: "user",
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
  },
);
