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

import { createVercelAIEmbeddingProvider } from "@/adapters/vercel/backend/embedding.js";
import { BackendProviderConfig } from "@/backend/constants.js";
import { OllamaProvider, OllamaProviderSettings } from "ollama-ai-provider";
import { createOllamaClient } from "@/adapters/ollama/backend/client.js";

export type OllamaEmbeddingSettings = NonNullable<Parameters<OllamaProvider["embedding"]>[1]>;

export const OllamaEmbeddingModel = createVercelAIEmbeddingProvider(
  BackendProviderConfig.OpenAI,
  (
    modelId: string,
    settings?: OllamaEmbeddingSettings,
    clientSettings?: OllamaProviderSettings,
  ) => {
    const client = createOllamaClient(clientSettings);
    return client.embedding(modelId, settings);
  },
);
