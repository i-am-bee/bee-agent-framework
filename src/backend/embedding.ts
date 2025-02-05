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

import { embedMany } from "ai";
import { Serializable } from "@/internals/serializable.js";
import { Callback } from "@/emitter/types.js";
import { FrameworkError } from "@/errors.js";
import { ChatModelCache } from "@/backend/chat.js";
import { Emitter } from "@/emitter/emitter.js";
import { shallowCopy } from "@/serializer/utils.js";
import { GetRunContext, RunContext } from "@/context.js";
import { pRetry } from "@/internals/helpers/retry.js";
import { NullCache } from "@/cache/nullCache.js";
import { FullModelName, loadProvider, parseModel } from "@/backend/utils.js";
import { ProviderName } from "@/backend/constants.js";
import { EmbeddingModelError } from "@/backend/errors.js";

export type EmbeddingModelInput = Omit<Parameters<typeof embedMany<string>>[0], "model">;

export interface EmbeddingModelOutput {
  values: string[];
  embeddings: number[][];
  usage: { tokens?: number };
}

export interface EmbeddingModelEvents {
  success?: Callback<{ value: EmbeddingModelOutput }>;
  start?: Callback<{ input: EmbeddingModelInput; options: any }>;
  error?: Callback<{ input: EmbeddingModelInput; options: any; error: FrameworkError }>;
  finish?: Callback<null>;
}

export type EmbeddingModelEmitter<A = Record<never, never>> = Emitter<
  EmbeddingModelEvents & Omit<A, keyof EmbeddingModelEvents>
>;

export abstract class EmbeddingModel extends Serializable {
  public abstract readonly emitter: Emitter<EmbeddingModelEvents>;
  public readonly cache: ChatModelCache = new NullCache();

  abstract get modelId(): string;
  abstract get providerId(): string;

  create(input: EmbeddingModelInput, ...args: any[]) {
    input = shallowCopy(input);
    args = shallowCopy(args);

    return RunContext.enter(
      this,
      { params: [input, ...args] as const, signal: input?.abortSignal },
      async (run) => {
        try {
          await run.emitter.emit("start", { input, options: args });
          const result: EmbeddingModelOutput = await pRetry(() => this._create(input, run), {
            retries: input.maxRetries || 0,
            signal: run.signal,
          });
          await run.emitter.emit("success", { value: result });
          return result;
        } catch (error) {
          await run.emitter.emit("error", { input, error, options: args });
          if (error instanceof EmbeddingModelError) {
            throw error;
          } else {
            throw new EmbeddingModelError(`LLM has occurred an error.`, [error]);
          }
        } finally {
          await run.emitter.emit("finish", null);
        }
      },
    ); // TODO: telemetry?
  }

  static async fromName(name: FullModelName | ProviderName, options?: Record<string, any>) {
    const { providerId, modelId = "" } = parseModel(name);
    const provider = await loadProvider(providerId, options);
    return provider.embeddingModel(modelId);
  }

  protected abstract _create(
    input: EmbeddingModelInput,
    run: GetRunContext<typeof this>,
  ): Promise<EmbeddingModelOutput>;

  createSnapshot() {
    return { cache: this.cache, emitter: this.emitter };
  }

  destroy() {
    this.emitter.destroy();
  }
}
