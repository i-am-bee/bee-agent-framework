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

import { ChatModel } from "@/backend/chat.js";
import { EmbeddingModel } from "@/backend/embedding.js";
import { Serializable } from "@/internals/serializable.js";

type Options = Record<string, any>;

export interface BackendProviderConfig {
  chat: { modelId: string; options: Options };
  embedding: { modelId: string; options: Options };
}

export abstract class BackendProvider extends Serializable {
  abstract readonly config: BackendProviderConfig;

  abstract chatModel(modelId: string, options?: Options): ChatModel;
  abstract embeddingModel(modelId: string, options?: Options): EmbeddingModel;
}
