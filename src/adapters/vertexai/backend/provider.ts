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
import * as vertexai from "@ai-sdk/google-vertex";
import { VertexAIChatModel, VertexAIChatSettings } from "@/adapters/vertexai/backend/chat.js";
import {
  VertexAIEmbeddingModel,
  VertexAIEmbeddingSettings,
} from "@/adapters/vertexai/backend/embedding.js";
import { createVertexAIClient } from "@/adapters/vertexai/backend/client.js";
import { getEnv } from "@/internals/env.js";
import { shallowCopy } from "@/serializer/utils.js";

export class VertexAIProvider extends BackendProvider {
  protected client: vertexai.GoogleVertexProvider;

  readonly config = {
    chat: {
      modelId: getEnv("VERTEX_API_CHAT_MODEL", "TODO"),
      options: {} as VertexAIChatSettings,
    },
    embedding: {
      modelId: getEnv("VERTEX_API_EMBEDDING_MODEL", "TODO"),
      options: {} as VertexAIEmbeddingSettings,
    },
  } as const;

  constructor(options?: vertexai.GoogleVertexProviderSettings) {
    super();
    this.client = createVertexAIClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.languageModel>) {
    const model = this.client.languageModel(...args);
    return new VertexAIChatModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.textEmbeddingModel>) {
    const model = this.client.textEmbeddingModel(...args);
    return new VertexAIEmbeddingModel(model);
  }

  createSnapshot() {
    return { client: this.client, config: shallowCopy(this.config) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
