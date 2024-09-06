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

export interface GenerateCallbacks {
  newToken?: Callback<{ value: BaseLLMOutput; callbacks: { abort: () => void } }>;
  success?: Callback<{ value: BaseLLMOutput }>;
  start?: Callback<{ input: any; options: unknown }>;
  error?: Callback<{ input: any; error: FrameworkError; options: unknown }>;
  finish?: Callback<null>;
}

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

export interface LLMMeta {
  tokenLimit: number;
}

export abstract class BaseLLM<
  TInput,
  TOutput extends BaseLLMOutput,
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends Serializable<any> {
  public abstract readonly emitter: Emitter<GenerateCallbacks>;

  constructor(
    public readonly modelId: string,
    public readonly executionOptions: ExecutionOptions = {},
  ) {
    super();
  }

  abstract meta(): Promise<LLMMeta>;

  abstract tokenize(input: TInput): Promise<BaseLLMTokenizeOutput>;

  generate(input: TInput, options?: TGenerateOptions) {
    return RunContext.enter(
      { self: this, params: [input, options] as const, signal: options?.signal },
      async (run) => {
        try {
          await run.emitter.emit("start", { input, options });

          if (options?.stream) {
            const chunks: TOutput[] = [];
            const controller = createAbortController(options?.signal);

            const tokenEmitter = run.emitter.child({ groupId: "tokens" });
            for await (const chunk of this._stream(
              input,
              {
                ...options,
                signal: controller.signal,
              },
              // @ts-expect-error wrong types
              run,
            )) {
              chunks.push(chunk);
              await tokenEmitter.emit("newToken", {
                value: chunk,
                callbacks: { abort: () => controller.abort() },
              });
              if (controller.signal.aborted) {
                break;
              }
            }

            const result = this._mergeChunks(chunks);
            await run.emitter.emit("success", { value: result });
            return result;
          }

          // @ts-expect-error types
          const result = await pRetry(() => this._generate(input, options ?? {}, run), {
            retries: this.executionOptions.maxRetries || 0,
            ...options,
            signal: run.signal,
          });
          await run.emitter.emit("success", { value: result });
          return result;
        } catch (error) {
          await run.emitter.emit("error", { input, error, options });
          if (error instanceof LLMError) {
            throw error;
          } else {
            throw new LLMError(`LLM has occurred an error.`, [error]);
          }
        } finally {
          await run.emitter.emit("finish", null);
        }
      },
    );
  }

  async *stream(input: TInput, options?: StreamGenerateOptions): AsyncStream<TOutput> {
    return yield* await RunContext.enter(
      { self: this, params: [input, options] as const, signal: options?.signal },
      async (run) => {
        // @ts-expect-error wrong types
        return this._stream(input, options, run);
      },
    );
  }

  protected abstract _generate(
    input: TInput,
    options: TGenerateOptions,
    run: GetRunContext<typeof this>,
  ): Promise<TOutput>;

  protected abstract _stream(
    input: TInput,
    options: StreamGenerateOptions,
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
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export type AnyLLM<I = string, T = BaseLLMOutput> = BaseLLM<I, T extends BaseLLMOutput ? T : never>;
export type InferLLMOutput<T> = T extends BaseLLM<any, infer A, any> ? A : never;
