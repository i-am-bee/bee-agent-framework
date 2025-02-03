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
import { OpenAIEmbeddingSettings } from "@ai-sdk/openai/internal";
import { createAzureClient } from "@/adapters/azure/backend/client.js";
import { AzureOpenAIProviderSettings } from "@ai-sdk/azure";
import { BackendProviderConfig } from "@/backend/constants.js";

export type AzureEmbeddingSettings = OpenAIEmbeddingSettings;

export const AzureEmbeddingModel = createVercelAIEmbeddingProvider(
  BackendProviderConfig.Azure,
  (
    modelId: string,
    options?: AzureEmbeddingSettings,
    clientSettings?: AzureOpenAIProviderSettings,
  ) => {
    const client = createAzureClient(clientSettings);
    return client.textEmbeddingModel(modelId, options);
  },
);
