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

import { verifyDeserialization } from "@tests/e2e/utils.js";
import { LangChainLLM } from "@/adapters/langchain/llms/llm.js";
import { GenAIModel } from "@ibm-generative-ai/node-sdk/langchain";
import { Client } from "@ibm-generative-ai/node-sdk";
import { afterAll, beforeAll, vi } from "vitest";

describe("Langchain LLM", () => {
  beforeAll(() => {
    vi.stubEnv("GENAI_API_KEY", "123");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  const getInstance = () => {
    return new LangChainLLM(
      new GenAIModel({
        model_id: "google/flan-ul2",
        client: new Client(),
        parameters: {
          max_new_tokens: 100,
        },
      }),
    );
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = await LangChainLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
