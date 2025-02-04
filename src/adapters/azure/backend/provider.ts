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

import "dotenv/config";
import { AzureOpenAIProvider, AzureOpenAIProviderSettings } from "@ai-sdk/azure";
import { getEnv } from "@/internals/env.js";
import { BackendProvider } from "@/backend/provider.js";
import { AzureEmbeddingModel, AzureEmbeddingSettings } from "@/adapters/azure/backend/embedding.js";
import { AzureChatModel, AzureChatSettings } from "@/adapters/azure/backend/chat.js";
import { createAzureClient } from "@/adapters/azure/backend/client.js";

export class AzureProvider extends BackendProvider {
  protected readonly client: AzureOpenAIProvider;

  readonly config = {
    chat: {
      modelId: getEnv("AZURE_OPENAI_API_DEPLOYMENT", "gpt-4o"),
      options: {} as AzureChatSettings,
    },
    embedding: {
      // TODO: different client for embedding
      modelId: getEnv("AZURE_OPENAI_API_EMBEDDING_DEPLOYMENT", "text-embedding-3-small"),
      options: {} as AzureEmbeddingSettings,
    },
  } as const;

  constructor(options?: AzureOpenAIProviderSettings) {
    super();
    this.client = createAzureClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.chat>) {
    const [deploymentId, settings] = args;

    const config = this.config.chat;
    const model = this.client.chat(deploymentId || config.modelId, {
      ...config.options,
      ...settings,
    });
    return AzureChatModel.fromModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.textEmbeddingModel>) {
    const [deploymentId, settings] = args;

    const config = this.config.embedding;
    const model = this.client.textEmbeddingModel(deploymentId || config.modelId, {
      ...config.options,
      ...settings,
    });

    return AzureEmbeddingModel.fromModel(model);
  }

  createSnapshot() {
    return { client: this.client };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
