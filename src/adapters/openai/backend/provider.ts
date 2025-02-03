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

import { OpenAIChatSettings, OpenAIEmbeddingSettings } from "@ai-sdk/openai/internal";
import { BackendProvider } from "@/backend/provider.js";
import * as openai from "@ai-sdk/openai";
import { OpenAIChatModel } from "@/adapters/openai/backend/chat.js";
import { OpenAIEmbeddingModel } from "@/adapters/openai/backend/embedding.js";
import { createOpenAIClient } from "@/adapters/openai/backend/client.js";
import { getEnv } from "@/internals/env.js";

export class OpenAIProvider extends BackendProvider {
  protected client: openai.OpenAIProvider;

  readonly config = {
    chat: {
      modelId: getEnv("OPENAI_API_CHAT_MODEL", "gpt-4o"),
      options: {} as OpenAIChatSettings,
    },
    embedding: {
      modelId: getEnv("OPENAI_API_EMBEDDING_MODEL", "text-embedding-3-small"),
      options: {} as OpenAIEmbeddingSettings,
    },
  } as const;

  constructor(options?: openai.OpenAIProviderSettings) {
    super();
    this.client = createOpenAIClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.chat>) {
    const model = this.client.chat(...args);
    return new OpenAIChatModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.textEmbeddingModel>) {
    const model = this.client.textEmbeddingModel(...args);
    return new OpenAIEmbeddingModel(model);
  }

  createSnapshot() {
    return { client: this.client };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
