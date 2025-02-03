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

import { BackendProvider, BackendProviderConfig } from "@/backend/provider.js";
import { WatsonXChatModel, WatsonXChatParams } from "@/adapters/watsonx/backend/chat.js";
import { createWatsonXClient, WatsonXClientSettings } from "@/adapters/watsonx/backend/client.js";
import { WatsonXEmbeddingModel } from "@/adapters/watsonx/backend/embedding.js";
import { EmbeddingParameters } from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { getEnv } from "@/internals/env.js";
import { shallowCopy } from "@/serializer/utils.js";

export class WatsonXProvider extends BackendProvider {
  protected readonly client;
  public readonly config: BackendProviderConfig = {
    chat: {
      modelId: getEnv("WATSONX_API_CHAT_MODEL", "ibm/granite-3-8b-instruct"),
      options: {} as WatsonXChatParams,
    },
    embedding: {
      modelId: getEnv("WATSONX_API_EMBEDDING_MODEL", "ibm/granite-embedding-107m-multilingual"),
      options: { return_options: { input_text: true } } as EmbeddingParameters,
    },
  };

  constructor(input?: WatsonXClientSettings) {
    super();
    this.client = createWatsonXClient(input);
  }

  chatModel(modelId: string, settings?: WatsonXChatParams) {
    return new WatsonXChatModel(
      modelId || this.config.chat.modelId,
      { ...this.config.chat.options, ...settings },
      this.client,
    );
  }

  embeddingModel(modelId: string, settings?: EmbeddingParameters) {
    return new WatsonXEmbeddingModel(
      modelId || this.config.embedding.modelId,
      { ...this.config.embedding.options, ...settings },
      this.client,
    );
  }

  createSnapshot() {
    return {
      client: this.client,
      config: shallowCopy(this.config),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
