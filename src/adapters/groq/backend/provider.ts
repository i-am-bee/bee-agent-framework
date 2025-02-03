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
import * as groq from "@ai-sdk/groq";
import { GroqChatModel, GroqChatSettings } from "@/adapters/groq/backend/chat.js";
import { GroqEmbeddingModel, GroqEmbeddingSettings } from "@/adapters/groq/backend/embedding.js";
import { createGroqClient } from "@/adapters/groq/backend/client.js";
import { getEnv } from "@/internals/env.js";
import { shallowCopy } from "@/serializer/utils.js";

export class GroqProvider extends BackendProvider {
  protected client: groq.GroqProvider;

  readonly config = {
    chat: {
      modelId: getEnv("GROQ_API_CHAT_MODEL", "TODO"),
      options: {} as GroqChatSettings,
    },
    embedding: {
      modelId: getEnv("GROQ_API_EMBEDDING_MODEL", "TODO"),
      options: {} as GroqEmbeddingSettings,
    },
  } as const;

  constructor(options?: groq.GroqProviderSettings) {
    super();
    this.client = createGroqClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.languageModel>) {
    const model = this.client.languageModel(...args);
    return new GroqChatModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.textEmbeddingModel>) {
    const model = this.client.textEmbeddingModel(...args);
    return new GroqEmbeddingModel(model);
  }

  createSnapshot() {
    return { client: this.client, config: shallowCopy(this.config) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
