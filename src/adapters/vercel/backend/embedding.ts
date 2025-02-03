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

import {
  EmbeddingModel,
  EmbeddingModelInput,
  EmbeddingModelOutput,
  EmbeddingModelEvents,
} from "@/backend/embedding.js";
import { embedMany, EmbeddingModel as VercelEmbeddingModel } from "ai";
import { ProviderDef } from "@/backend/constants.js";
import { Emitter } from "@/emitter/emitter.js";
import { RunContext } from "@/context.js";

export function createVercelAIEmbeddingProvider<
  R extends VercelEmbeddingModel<string>,
  T extends (...args: any[]) => R,
>(provider: ProviderDef, fn: T) {
  const DynamicEmbeddingProvider = class extends EmbeddingModel {
    protected readonly model: R;
    public readonly emitter: Emitter<EmbeddingModelEvents>;

    constructor(...args: Parameters<T>);
    constructor(_INTERNAL_MODEL: R);
    constructor(...args: Parameters<T> | [R]) {
      super();
      this.model = typeof args[0] === "object" ? args[0] : fn(...args);
      this.emitter = Emitter.root.child({
        namespace: ["backend", provider.module, "embedding"],
      });
    }

    get modelId(): string {
      return this.model.modelId;
    }

    get providerId(): string {
      return this.model.provider;
    }

    protected async _create(
      input: EmbeddingModelInput,
      run: RunContext<this>,
    ): Promise<EmbeddingModelOutput> {
      return embedMany<string>({
        model: this.model,
        values: input.values,
        abortSignal: run.signal,
      });
    }

    createSnapshot() {
      return {
        model: this.model,
      };
    }

    loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
      Object.assign(this, snapshot);
    }
  };

  Object.defineProperty(DynamicEmbeddingProvider, "name", {
    value: `${provider.name}EmbeddingModel`,
    writable: false,
  });
  return DynamicEmbeddingProvider;
}
