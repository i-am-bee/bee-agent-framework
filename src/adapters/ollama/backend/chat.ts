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

import { VercelChatModel } from "@/adapters/vercel/backend/chat.js";
import { OllamaProvider } from "ollama-ai-provider";
import { OllamaClient, OllamaClientSettings } from "@/adapters/ollama/backend/client.js";
import { getEnv } from "@/internals/env.js";

type OllamaParameters = Parameters<OllamaProvider["languageModel"]>;
export type OllamaChatModelId = NonNullable<OllamaParameters[0]>;
export type OllamaChatModelSettings = NonNullable<OllamaParameters[1]>;

export class OllamaChatModel extends VercelChatModel {
  constructor(
    modelId: OllamaChatModelId = getEnv("OLLAMA_API_CHAT_MODEL", "llama3.1:8b"),
    settings: OllamaChatModelSettings = {},
    client?: OllamaClient | OllamaClientSettings,
  ) {
    const model = OllamaClient.ensure(client).instance.chat(modelId, {
      ...settings,
      simulateStreaming: true, // otherwise breaks event propagation
      structuredOutputs: true, // otherwise breaks generated structure
    });
    super(model);
  }

  static {
    this.register();
  }
}
