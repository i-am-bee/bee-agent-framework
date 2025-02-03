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

import { BackendProvider } from "@/backend/provider.js";
import * as ollama from "ollama-ai-provider";
import { getEnv } from "@/internals/env.js";
import { OllamaChatModel, OllamaChatSettings } from "@/adapters/ollama/backend/chat.js";
import {
  OllamaEmbeddingModel,
  OllamaEmbeddingSettings,
} from "@/adapters/ollama/backend/embedding.js";
import { createOllamaClient } from "@/adapters/ollama/backend/client.js";

export class OllamaProvider extends BackendProvider {
  protected client: ollama.OllamaProvider;

  readonly config = {
    chat: {
      modelId: getEnv("OLLAMA_API_CHAT_MODEL", "llama3.1:8b"),
      options: {} as OllamaChatSettings,
    },
    embedding: {
      modelId: getEnv("OLLAMA_API_EMBEDDING_MODEL", "nomic-embed-text"),
      options: {} as OllamaEmbeddingSettings,
    },
  } as const;

  constructor(options?: ollama.OllamaProviderSettings) {
    super();
    this.client = createOllamaClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.chat>) {
    const [modelId, config] = args;
    const model = this.client.chat(modelId || this.config.chat.modelId, {
      ...this.config.chat.options,
      ...config,
    });
    return new OllamaChatModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.textEmbeddingModel>) {
    const [modelId, config] = args;
    const model = this.client.textEmbeddingModel(modelId || this.config.embedding.modelId, {
      ...this.config.embedding.options,
      ...config,
    });
    return new OllamaEmbeddingModel(model);
  }

  createSnapshot() {
    return { client: this.client };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
