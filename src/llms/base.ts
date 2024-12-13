/**
 * Copyright 2024 IBM Corp.
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

import { FrameworkError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";
import { createAbortController } from "@/internals/helpers/cancellation.js";
import { OneOf } from "@/internals/types.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext, RunContext } from "@/context.js";
import { Callback } from "@/emitter/types.js";
import { shallowCopy } from "@/serializer/utils.js";
import { pRetry } from "@/internals/helpers/retry.js";
import { emitterToGenerator } from "@/internals/helpers/promise.js";
import { BaseCache } from "@/cache/base.js";
import { NullCache } from "@/cache/nullCache.js";
import { ObjectHashKeyFn } from "@/cache/decoratorCache.js";
import { doNothing, omit } from "remeda";
import { Task } from "promise-based-task";
import { INSTRUMENTATION_ENABLED } from "@/instrumentation/config.js";
import { createTelemetryMiddleware } from "@/instrumentation/create-telemetry-middleware.js";

export interface BaseLLMEvents<TInput = any, TOutput extends BaseLLMOutput = BaseLLMOutput> {
  newToken?: Callback<{ value: TOutput; callbacks: { abort: () => void } }>;
  success?: Callback<{ value: TOutput }>;
  start?: Callback<{ input: TInput; options: unknown }>;
  error?: Callback<{ input: TInput; error: FrameworkError; options: unknown }>;
  finish?: Callback<null>;
}

/**
 * @deprecated Use BaseLLMEvents instead
 */
export type GenerateCallbacks = BaseLLMEvents;

export type GuidedOptions = OneOf<
  [
    {
      json?: string | Record<string, any>;
    },
    {
      regex?: string;
    },
    {
      choice?: string[];
    },
    {
      grammar?: string;
    },
    {
      decoding_backend?: string;
    },
    {
      whitespace_pattern?: string;
    },
  ]
>;

export interface GenerateOptions {
  stream?: boolean;
  signal?: AbortSignal;
  guided?: GuidedOptions;
}

export interface InternalGenerateOptions {
  signal?: AbortSignal;
}

export interface StreamGenerateOptions {
  signal?: AbortSignal;
  guided?: GuidedOptions;
}

export type AsyncStream<T, T2 = any> = AsyncGenerator<T, T2, any>;

export class LLMError extends FrameworkError {}
export class LLMFatalError extends LLMError {
  constructor(message: string, errors?: Error[]) {
    super(message, errors, {
      isRetryable: false,
      isFatal: true,
    });
  }
}
export class LLMOutputError extends LLMFatalError {}

export interface BaseLLMTokenizeOutput {
  tokensCount: number;
  tokens?: string[];
}

export abstract class BaseLLMOutput extends Serializable {
  mergeImmutable<T extends BaseLLMOutput>(this: T, other: T): T {
    const newInstance = this.clone() as T;
    newInstance.merge(other);
    return newInstance;
  }

  abstract merge(other: BaseLLMOutput): void;

  abstract getTextContent(): string;

  abstract toString(): string;
}

export interface ExecutionOptions {
  maxRetries?: number;
}

export interface EmbeddingOptions {
  signal?: AbortSignal;
}

export interface EmbeddingOutput {
  embeddings: number[][];
}

export interface LLMMeta {
  tokenLimit: number;
}

export type LLMCache<T extends BaseLLMOutput> = BaseCache<Task<T[]>>;

export abstract class BaseLLM<
  TInput,
  TOutput extends BaseLLMOutput,
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends Serializable<any> {
  public abstract readonly emitter: Emitter<BaseLLMEvents<unknown, TOutput>>;

  constructor(
    public readonly modelId: string,
    public readonly executionOptions: ExecutionOptions = {},
    public readonly cache: LLMCache<TOutput> = new NullCache(),
  ) {
    super();
  }

  abstract meta(): Promise<LLMMeta>;

  abstract embed(input: TInput[], options?: EmbeddingOptions): Promise<EmbeddingOutput>;

  abstract tokenize(input: TInput): Promise<BaseLLMTokenizeOutput>;

  generate(input: TInput, options: Partial<TGenerateOptions> = {}) {
    input = shallowCopy(input);
    options = shallowCopy(options);

    return RunContext.enter(
      this,
      { params: [input, options] as const, signal: options?.signal },
      async (run) => {
        const cacheEntry = await this.createCacheAccessor(input, options);

        try {
          await run.emitter.emit("start", { input, options });

          if (options?.stream) {
            const chunks: TOutput[] = [];
            const controller = createAbortController(options?.signal);

            const tokenEmitter = run.emitter.child({ groupId: "tokens" });
            for await (const chunk of cacheEntry.value ??
              this._stream(
                input,
                {
                  ...options,
                  signal: controller.signal,
                },
                run,
              )) {
              if (controller.signal.aborted) {
                continue;
              }

              chunks.push(chunk);
              await tokenEmitter.emit("newToken", {
                value: chunk,
                callbacks: { abort: () => controller.abort() },
              });
            }

            const result = this._mergeChunks(chunks);
            await run.emitter.emit("success", { value: result });
            cacheEntry.resolve(chunks);
            return result;
          }

          const result: TOutput =
            cacheEntry?.value?.at(0) ||
            (await pRetry(() => this._generate(input, options, run), {
              retries: this.executionOptions.maxRetries || 0,
              ...options,
              signal: run.signal,
            }));
          await run.emitter.emit("success", { value: result });
          cacheEntry.resolve([result]);
          return result;
        } catch (error) {
          await run.emitter.emit("error", { input, error, options });
          await cacheEntry.reject(error);
          if (error instanceof LLMError) {
            throw error;
          } else {
            throw new LLMError(`LLM has occurred an error.`, [error]);
          }
        } finally {
          await run.emitter.emit("finish", null);
        }
      },
    ).middleware(INSTRUMENTATION_ENABLED ? createTelemetryMiddleware() : doNothing());
  }

  async *stream(input: TInput, options: Partial<StreamGenerateOptions> = {}): AsyncStream<TOutput> {
    input = shallowCopy(input);
    options = shallowCopy(options);

    return yield* emitterToGenerator(async ({ emit }) => {
      return RunContext.enter(
        this,
        { params: [input, options] as const, signal: options?.signal },
        async (run) => {
          const cacheEntry = await this.createCacheAccessor(input, options);

          try {
            await run.emitter.emit("start", { input, options });

            const tokenEmitter = run.emitter.child({ groupId: "tokens" });
            const chunks: TOutput[] = [];
            const controller = createAbortController(options?.signal);

            for await (const chunk of cacheEntry.value ||
              this._stream(input, { ...options, signal: controller.signal }, run)) {
              if (controller.signal.aborted) {
                continue;
              }

              chunks.push(chunk);
              await tokenEmitter.emit("newToken", {
                value: chunk,
                callbacks: { abort: () => controller.abort() },
              });
              emit(chunk);
            }
            const result = this._mergeChunks(chunks);
            await run.emitter.emit("success", { value: result });
            cacheEntry.resolve(chunks);
          } catch (error) {
            await run.emitter.emit("error", { input, error, options });
            await cacheEntry.reject(error);
            if (error instanceof LLMError) {
              throw error;
            } else {
              throw new LLMError(`LLM has occurred an error.`, [error]);
            }
          } finally {
            await run.emitter.emit("finish", null);
          }
        },
      ).middleware(INSTRUMENTATION_ENABLED ? createTelemetryMiddleware() : doNothing());
    });
  }

  protected abstract _generate(
    input: TInput,
    options: Partial<TGenerateOptions>,
    run: GetRunContext<typeof this>,
  ): Promise<TOutput>;

  protected abstract _stream(
    input: TInput,
    options: Partial<StreamGenerateOptions>,
    run: GetRunContext<typeof this>,
  ): AsyncStream<TOutput, void>;

  protected _mergeChunks(chunks: TOutput[]): TOutput {
    if (chunks.length === 0) {
      throw new LLMOutputError("Cannot merge empty chunks!");
    }
    return chunks.reduce((prev, cur) => prev.mergeImmutable(cur));
  }

  static cast<T extends BaseLLM<unknown, BaseLLMOutput>>(
    this: new (...args: any[]) => T,
    value: unknown,
  ): asserts value is T {}

  static castInput<A>(
    this: new (...args: any[]) => BaseLLM<A, BaseLLMOutput>,
    value: unknown,
  ): asserts value is A {}

  static castOutput<T extends BaseLLM<unknown, BaseLLMOutput>>(
    this: new (...args: any[]) => T,
    value: BaseLLMOutput,
  ): asserts value is InferLLMOutput<T> {}

  createSnapshot() {
    return {
      modelId: this.modelId,
      executionOptions: shallowCopy(this.executionOptions),
      emitter: this.emitter,
      cache: this.cache,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  protected async createCacheAccessor(
    input: TInput,
    options: Partial<GenerateOptions> | Partial<StreamGenerateOptions>,
    ...extra: any[]
  ) {
    const key = ObjectHashKeyFn(input, omit(options ?? {}, ["signal"]), ...extra);
    const value = await this.cache.get(key);
    const isNew = value === undefined;

    let task: Task<TOutput[]> | null = null;
    if (isNew) {
      task = new Task();
      await this.cache.set(key, task);
    }

    return {
      key,
      value,
      resolve: <T2 extends TOutput>(value: T2 | T2[]) => {
        task?.resolve?.(Array.isArray(value) ? value : [value]);
      },
      reject: async (error: Error) => {
        task?.reject?.(error);
        if (isNew) {
          await this.cache.delete(key);
        }
      },
    };
  }
}

export type AnyLLM<I = string, T = BaseLLMOutput> = BaseLLM<I, T extends BaseLLMOutput ? T : never>;
export type InferLLMOutput<T> = T extends BaseLLM<any, infer A, any> ? A : never;
