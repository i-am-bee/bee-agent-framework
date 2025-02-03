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
import { shallowCopy } from "@/serializer/utils.js";
import { DummyEmbeddingModel } from "@/adapters/dummy/backend/embedding.js";
import { DummyChatModel } from "@/adapters/dummy/backend/chat.js";

export class DummyProvider extends BackendProvider {
  public readonly config: BackendProviderConfig = {
    chat: { modelId: "dummy", options: {} },
    embedding: { modelId: "dummy", options: {} },
  } as const;

  chatModel(modelId: string) {
    return new DummyChatModel(modelId);
  }

  embeddingModel(modelId: string) {
    return new DummyEmbeddingModel(modelId);
  }

  createSnapshot(): unknown {
    return { config: shallowCopy(this.config) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
