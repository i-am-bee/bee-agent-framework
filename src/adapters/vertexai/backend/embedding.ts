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
import { createVertexAIClient } from "./client.js";
import { GoogleVertexProviderSettings } from "@ai-sdk/google-vertex";
export type VertexAIEmbeddingSettings = Record<string, any>;

export const VertexAIEmbeddingModel = createVercelAIEmbeddingProvider(
  BackendProviderConfig.VertexAI,
  (
    modelId: string,
    settings?: VertexAIEmbeddingSettings,
    clientSettings?: GoogleVertexProviderSettings,
  ) => {
    const client = createVertexAIClient(clientSettings);
    return client.textEmbeddingModel(modelId);
  },
);
