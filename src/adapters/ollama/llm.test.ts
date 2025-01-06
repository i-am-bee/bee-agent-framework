/**
 * Copyright 2025 IBM Corp.
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
import { OllamaLLM } from "@/adapters/ollama/llm.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";

describe("Ollama LLM", () => {
  const getInstance = () => {
    return new OllamaLLM({
      modelId: "llama3.1",
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = OllamaLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});

describe("Ollama ChatLLM", () => {
  const getInstance = () => {
    return new OllamaChatLLM({
      modelId: "llama3.1",
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = OllamaChatLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
