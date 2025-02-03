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

import { Serializable } from "@/internals/serializable.js";
import { shallowCopy } from "@/serializer/utils.js";
import { customMerge } from "@/internals/helpers/object.js";
import { takeBigger } from "@/internals/helpers/number.js";
import { Callback } from "@/emitter/types.js";
import { FrameworkError, NotImplementedError } from "@/errors.js";
import { Emitter } from "@/emitter/emitter.js";
import { RunContext } from "@/context.js";
import { createAbortController } from "@/internals/helpers/cancellation.js";
import { pRetry } from "@/internals/helpers/retry.js";
import { INSTRUMENTATION_ENABLED } from "@/instrumentation/config.js";
import { createTelemetryMiddleware } from "@/instrumentation/create-telemetry-middleware.js";
import { doNothing, omit } from "remeda";
import { emitterToGenerator } from "@/internals/helpers/promise.js";
import { ObjectHashKeyFn } from "@/cache/decoratorCache.js";
import { Task } from "promise-based-task";
import { NullCache } from "@/cache/nullCache.js";
import { BaseCache } from "@/cache/base.js";
import { FullModelName, loadProvider, parseModel } from "@/backend/utils.js";
import { ProviderName } from "@/backend/constants.js";
import { AnyTool } from "@/tools/base.js";
import { Message, SystemMessage, UserMessage } from "@/backend/message.js";
import {
  JSONSchema7,
  LanguageModelV1FunctionTool,
  LanguageModelV1ProviderDefinedTool,
  LanguageModelV1ToolChoice,
} from "@ai-sdk/provider";
import { ChatModelError } from "@/backend/errors.js";
import { z } from "zod";
import {
  createSchemaValidator,
  parseBrokenJson,
  toJsonSchema,
} from "@/internals/helpers/schema.js";
import { Retryable } from "@/internals/helpers/retryable.js";
import type { ValidateFunction } from "ajv";
import { PromptTemplate } from "@/template.js";

interface CallSettings {
  abortSignal?: AbortSignal;
  maxRetries?: number;
  maxTokens?: number;
  headers?: Record<string, any>;
  topP?: number;
  frequencyPenalty?: number;
  temperature?: number;
  topK?: number;
  n?: number;
  presencePenalty?: number;
  experimental_providerMetadata?: Record<string, any>;
}

export interface ChatModelObjectInput<T> extends CallSettings {
  schema: z.ZodSchema<T>;
  messages: Message[];
}

export interface ChatModelObjectOutput<T> {
  object: T;
}

//export type ChatModelInp2ut = Omit<Parameters<typeof generateText>[0], "model" | "prompt">;
export interface ChatModelInput extends CallSettings {
  tools?: AnyTool[];
  stopSequences?: string[];
  responseFormat?:
    | {
        type: "regular";
        tools?: (LanguageModelV1FunctionTool | LanguageModelV1ProviderDefinedTool)[];
        toolChoice?: LanguageModelV1ToolChoice;
      }
    | {
        type: "object-json";
        schema?: JSONSchema7;
        name?: string;
        description?: string;
      }
    | {
        type: "object-tool";
        tool: LanguageModelV1FunctionTool;
      };
  toolChoice?: never; // TODO
  messages: Message[];
  system?: never; // TODO
}
export type ChatModelFinishReason =
  | "stop"
  | "length"
  | "content-filter"
  | "tool-calls"
  | "error"
  | "other"
  | "unknown";

export interface ChatModelUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatModelEvents {
  newToken?: Callback<{ value: ChatModelOutput; callbacks: { abort: () => void } }>;
  success?: Callback<{ value: ChatModelOutput }>;
  start?: Callback<{ input: ChatModelInput; options: any }>;
  error?: Callback<{ input: ChatModelInput; options: any; error: FrameworkError }>;
  finish?: Callback<null>;
}

export type ChatModelEmitter<A = Record<never, never>> = Emitter<
  ChatModelEvents & Omit<A, keyof ChatModelEvents>
>;

export type ChatModelCache = BaseCache<Task<ChatModelOutput[]>>;

export abstract class ChatModel extends Serializable {
  public abstract readonly emitter: Emitter<ChatModelEvents>;
  public readonly cache: ChatModelCache = new NullCache();

  abstract get modelId(): string;
  abstract get providerId(): string;

  create(input: ChatModelInput, ...args: any[]) {
    input = shallowCopy(input);
    args = shallowCopy(args);

    return RunContext.enter(
      this,
      { params: [input, ...args] as const, signal: input?.abortSignal },
      async (run) => {
        const cacheEntry = await this.createCacheAccessor(input, args);

        try {
          await run.emitter.emit("start", { input, options: args });
          const result: ChatModelOutput =
            cacheEntry?.value?.at(0) ||
            (await pRetry(() => this._create(input, run), {
              retries: input.maxRetries || 0,
              signal: run.signal,
            }));
          await run.emitter.emit("success", { value: result });
          cacheEntry.resolve([result]);
          return result;
        } catch (error) {
          await run.emitter.emit("error", { input, error, options: args });
          await cacheEntry.reject(error);
          if (error instanceof ChatModelError) {
            throw error;
          } else {
            throw new ChatModelError(`LLM has occurred an error.`, [error]);
          }
        } finally {
          await run.emitter.emit("finish", null);
        }
      },
    ).middleware(INSTRUMENTATION_ENABLED ? createTelemetryMiddleware() : doNothing());
  }

  createStream(input: ChatModelInput, ...args: any[]) {
    input = shallowCopy(input);
    args = shallowCopy(args);

    return RunContext.enter(
      this,
      { params: [input, ...args] as const, signal: input?.abortSignal },
      async (run) => {
        const result = new Task<ChatModelOutput>();
        const stream = emitterToGenerator<ChatModelOutput, ChatModelOutput>(async ({ emit }) => {
          const cacheEntry = await this.createCacheAccessor(input, ...args);

          try {
            await run.emitter.emit("start", { input, options: args });

            const tokenEmitter = run.emitter.child({ groupId: "tokens" });
            const controller = createAbortController(input?.abortSignal);

            const generator = this._createStream(input, run);
            while (true) {
              const { value, done } = await generator.next();
              if (done) {
                await run.emitter.emit("success", { value });
                result.resolve(value);
                return result;
              } else {
                await tokenEmitter.emit("newToken", {
                  value,
                  callbacks: { abort: () => controller.abort() },
                });
                emit(value);
              }
            }
            throw new NotImplementedError("unhandled state");
          } catch (error) {
            await run.emitter.emit("error", { input, error, options: args });
            await cacheEntry.reject(error);
            if (error instanceof ChatModelError) {
              throw error;
            } else {
              throw new ChatModelError(`LLM has occurred an error.`, [error]);
            }
          } finally {
            await run.emitter.emit("finish", null);
          }
        });

        return {
          stream,
          result,
          async *[Symbol.asyncIterator](): AsyncGenerator<ChatModelOutput> {
            yield* stream;
          },
        };
      },
    ).middleware(INSTRUMENTATION_ENABLED ? createTelemetryMiddleware() : doNothing());
  }

  createStructure<T>(input: ChatModelObjectInput<T>, ...args: any[]) {
    return RunContext.enter(
      this,
      { params: [input, ...args] as const, signal: input?.abortSignal },
      async (run) => {
        return await this._createStructure<T>(input, run);
      },
    );
  }

  static async fromName(name: FullModelName | ProviderName, options?: Record<string, any>) {
    const { providerId, modelId = "" } = parseModel(name);
    const provider = await loadProvider(providerId, options);
    return provider.chatModel(modelId);
  }

  protected abstract _create(
    input: ChatModelInput,
    run: RunContext<this>,
  ): Promise<ChatModelOutput>;
  protected abstract _createStream(
    input: ChatModelInput,
    run: RunContext<this>,
  ): AsyncGenerator<ChatModelOutput, ChatModelOutput>;

  protected async _createStructure<T>(
    input: ChatModelObjectInput<T>,
    run: RunContext<this>,
  ): Promise<ChatModelObjectOutput<T>> {
    const { schema, ...options } = input;
    const jsonSchema = toJsonSchema(schema);

    const systemTemplate = new PromptTemplate({
      schema: z.object({
        schema: z.string().min(1),
      }),
      template: `You are a helpful assistant that generates only valid JSON adhering to the following JSON Schema.

\`\`\`
{{schema}}
\`\`\`

IMPORTANT: You MUST answer with a JSON object that matches the JSON schema above.`,
    });

    const messages: Message[] = [
      new SystemMessage(systemTemplate.render({ schema: JSON.stringify(jsonSchema, null, 2) })),
      ...input.messages,
    ];

    const errorTemplate = new PromptTemplate({
      schema: z.object({
        errors: z.string(),
        expected: z.string(),
        received: z.string(),
      }),
      template: `Generated object does not match the expected JSON schema!

Validation Errors: {{errors}}`,
    });

    return new Retryable<ChatModelObjectOutput<T>>({
      executor: async () => {
        const response = await this._create(
          {
            ...options,
            messages,
            responseFormat: { type: "object-json" },
          },
          run,
        );

        const textResponse = response.getTextContent();
        const object: T = parseBrokenJson(textResponse, { pair: ["{", "}"] });
        const validator = createSchemaValidator(schema) as ValidateFunction<T>;

        const success = validator(object);
        if (!success) {
          const context = {
            expected: JSON.stringify(jsonSchema),
            received: textResponse,
            errors: JSON.stringify(validator.errors ?? []),
          };

          messages.push(new UserMessage(errorTemplate.render(context)));
          throw new ChatModelError(`LLM did not produce a valid output.`, [], {
            context,
          });
        }

        return { object };
      },
      config: {
        signal: run.signal,
        maxRetries: input?.maxRetries || 0,
      },
    }).get();
  }

  protected async createCacheAccessor(input: ChatModelInput, ...extra: any[]) {
    const key = ObjectHashKeyFn(omit(input ?? {}, ["abortSignal"]), ...extra);
    const value = await this.cache.get(key);
    const isNew = value === undefined;

    let task: Task<ChatModelOutput[]> | null = null;
    if (isNew) {
      task = new Task();
      await this.cache.set(key, task);
    }

    return {
      key,
      value,
      resolve: <T2 extends ChatModelOutput>(value: T2 | T2[]) => {
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

export class ChatModelOutput extends Serializable {
  constructor(
    public readonly messages: Message[],
    public usage?: ChatModelUsage,
    public finishReason?: ChatModelFinishReason,
  ) {
    super();
  }

  static fromChunks<T extends ChatModelOutput>([chunk, ...chunks]: T[]) {
    if (!chunk) {
      throw new ChatModelError("Cannot merge empty chunks!");
    }
    const final = chunk.clone();
    chunks.forEach((cur) => final.merge(cur));
    return final;
  }

  mergeImmutable<T extends ChatModelOutput>(this: ChatModelOutput, other: T): T {
    const newInstance = this.clone() as T;
    newInstance.merge(other);
    return newInstance;
  }

  merge(other: ChatModelOutput) {
    this.messages.push(...other.messages);
    this.finishReason = other.finishReason;
    if (this.usage && other.usage) {
      this.usage = customMerge([this.usage, other.usage], {
        totalTokens: takeBigger,
        promptTokens: takeBigger,
        completionTokens: takeBigger,
      });
    } else if (other.usage) {
      this.usage = shallowCopy(other.usage);
    }
  }

  getTextContent(): string {
    return this.messages.map((msg) => msg.getTextContent()).join("");
  }

  toString() {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      messages: shallowCopy(this.messages),
      usage: shallowCopy(this.usage),
      finishReason: this.finishReason,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
