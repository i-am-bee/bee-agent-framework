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

import { VertexAIClient, VertexAIClientSettings } from "./client.js";
import { VercelEmbeddingModel } from "@/adapters/vercel/backend/embedding.js";
import { EmbeddingModelSettings } from "@/backend/embedding.js";
export type VertexAIEmbeddingSettings = EmbeddingModelSettings;

export class VertexAIEmbeddingModel extends VercelEmbeddingModel {
  constructor(
    modelId: string,
    settings: VertexAIEmbeddingSettings = {},
    client?: VertexAIClient | VertexAIClientSettings,
  ) {
    const model = VertexAIClient.ensure(client).instance.textEmbeddingModel(modelId);
    super(model, settings);
  }
}
