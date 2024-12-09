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

import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { Ollama } from "ollama";

const host = process.env.OLLAMA_HOST;

describe.runIf(Boolean(host))("Ollama LLM", () => {
  const createLLM = () => {
    return new OllamaChatLLM({
      modelId: "llama3.1",
      client: new Ollama({
        host,
      }),
    });
  };

  it("Retrieves version", async () => {
    const llm = createLLM();
    const version = await llm.version();
    expect(version).toBeDefined();
  });
});
