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
import * as bedrock from "@ai-sdk/amazon-bedrock";
import { BedrockChatModel, BedrockChatSettings } from "@/adapters/bedrock/backend/chat.js";
import {
  BedrockEmbeddingModel,
  BedrockEmbeddingSettings,
} from "@/adapters/bedrock/backend/embedding.js";
import { createBedrockClient } from "@/adapters/bedrock/backend/client.js";
import { getEnv } from "@/internals/env.js";
import { shallowCopy } from "@/serializer/utils.js";

export class BedrockProvider extends BackendProvider {
  protected client: bedrock.AmazonBedrockProvider;

  readonly config = {
    chat: {
      modelId: getEnv("BEDROCK_API_CHAT_MODEL", "TODO"),
      options: {} as BedrockChatSettings,
    },
    embedding: {
      modelId: getEnv("BEDROCK_API_EMBEDDING_MODEL", "TODO"),
      options: {} as BedrockEmbeddingSettings,
    },
  } as const;

  constructor(options?: bedrock.AmazonBedrockProviderSettings) {
    super();
    this.client = createBedrockClient(options);
  }

  chatModel(...args: Parameters<typeof this.client.languageModel>) {
    const model = this.client.languageModel(...args);
    return BedrockChatModel.fromModel(model);
  }

  embeddingModel(...args: Parameters<typeof this.client.embedding>) {
    const model = this.client.embedding(...args);
    return BedrockEmbeddingModel.fromModel(model);
  }

  createSnapshot() {
    return { client: this.client, config: shallowCopy(this.config) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
