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
import { embedMany, EmbeddingModel as Model } from "ai";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";
import { toCamelCase } from "remeda";

type InternalEmbeddingModel = Model<string>;

export class VercelEmbeddingModel<
  R extends InternalEmbeddingModel = InternalEmbeddingModel,
> extends EmbeddingModel {
  protected readonly model: R;
  public readonly emitter: Emitter<EmbeddingModelEvents>;

  constructor(model: R) {
    super();
    this.model = model;
    this.emitter = Emitter.root.child({
      namespace: ["backend", this.providerId, "embedding"],
    });
  }

  static fromModel<T2 extends InternalEmbeddingModel, T extends VercelEmbeddingModel<T2>>(
    this: new (...args: any[]) => T,
    model: T2,
  ): T {
    if (this.prototype === VercelEmbeddingModel) {
      return new VercelEmbeddingModel(model) as T;
    } else {
      return Reflect.construct(VercelEmbeddingModel, [model], this) as T;
    }
  }

  get modelId(): string {
    return this.model.modelId;
  }

  get providerId(): string {
    const provider = this.model.provider.split(".")[0].split("-")[0];
    return toCamelCase(provider);
  }

  protected async _create(
    input: EmbeddingModelInput,
    run: GetRunContext<this>,
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
}
