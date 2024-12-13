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

import { BedrockChatLLM } from "@/adapters/bedrock/chat.js";
import { BaseMessage } from "@/llms/primitives/message.js";

describe.runIf([process.env.AWS_REGION].every((env) => Boolean(env)))("Bedrock Chat LLM", () => {
  it("Embeds", async () => {
    const llm = new BedrockChatLLM({
      region: process.env.AWS_REGION,
      modelId: "amazon.titan-embed-text-v1",
    });

    const response = await llm.embed([
      [BaseMessage.of({ role: "user", text: `Hello world!` })],
      [BaseMessage.of({ role: "user", text: `Hello family!` })],
    ]);
    expect(response.embeddings.length).toBe(2);
    expect(response.embeddings[0].length).toBe(512);
    expect(response.embeddings[1].length).toBe(512);
  });
});
