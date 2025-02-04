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
import { createGroqClient } from "./client.js";
import { GroqProvider } from "@/adapters/groq/backend/provider.js";
import { GroqProviderSettings } from "@ai-sdk/groq";

type Params = Parameters<GroqProvider["embeddingModel"]>;
export type GroqEmbeddingModelId = NonNullable<Params[0]>;
export type GroqEmbeddingSettings = Record<string, any>;

export class GroqEmbeddingModel extends VercelEmbeddingModel {
  constructor(
    modelId: GroqEmbeddingModelId,
    settings?: GroqEmbeddingSettings,
    clientSettings?: GroqProviderSettings,
  ) {
    const client = createGroqClient(clientSettings);
    const model = client.textEmbeddingModel(modelId);
    super(model);
  }
}
