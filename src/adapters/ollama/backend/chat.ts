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
import { OllamaProvider, OllamaProviderSettings } from "ollama-ai-provider";
import { createOllamaClient } from "@/adapters/ollama/backend/client.js";

export type OllamaChatSettings = NonNullable<Parameters<OllamaProvider["chat"]>[1]>;

export class OllamaChatModel extends VercelChatModel {
  constructor(
    modelId: string,
    settings?: OllamaChatSettings,
    clientSettings?: OllamaProviderSettings,
  ) {
    const client = createOllamaClient(clientSettings);
    const model = client.chat(modelId, settings);
    super(model);
  }

  static {
    this.register();
  }
}
