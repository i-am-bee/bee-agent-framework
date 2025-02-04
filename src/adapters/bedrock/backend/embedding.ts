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

import { VercelEmbeddingModel } from "@/adapters/vercel/backend/embedding.js";
import { createBedrockClient } from "./client.js";
import { AmazonBedrockProviderSettings, AmazonBedrockProvider } from "@ai-sdk/amazon-bedrock";

type Params = Parameters<AmazonBedrockProvider["embedding"]>;
export type BedrockEmbeddingModelId = NonNullable<Params[0]>;
export type BedrockEmbeddingSettings = NonNullable<Params[1]>;

export class BedrockEmbeddingModel extends VercelEmbeddingModel {
  constructor(
    modelId: BedrockEmbeddingModelId,
    settings?: BedrockEmbeddingSettings,
    clientSettings?: AmazonBedrockProviderSettings,
  ) {
    const client = createBedrockClient(clientSettings);
    const model = client.embedding(modelId, settings);
    super(model);
  }
}
