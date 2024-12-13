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

import {
  AsyncStream,
  BaseLLMTokenizeOutput,
  EmbeddingOutput,
  ExecutionOptions,
  GenerateOptions,
  LLMCache,
  LLMOutputError,
  StreamGenerateOptions,
} from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { Emitter } from "@/emitter/emitter.js";
import { ChatRequest, ChatResponse, Config, Ollama as Client, Options as Parameters } from "ollama";
import { signalRace } from "@/internals/helpers/promise.js";
import { GetRunContext } from "@/context.js";
import { Cache } from "@/cache/decoratorCache.js";
import { customMerge, getPropStrict } from "@/internals/helpers/object.js";
import { safeSum } from "@/internals/helpers/number.js";
import {
  extractModelMeta,
  registerClient,
  retrieveFormat,
  retrieveVersion,
} from "@/adapters/ollama/shared.js";
import { getEnv } from "@/internals/env.js";
import { OllamaEmbeddingOptions } from "@/adapters/ollama/llm.js";

export class OllamaChatLLMOutput extends ChatLLMOutput {
  public readonly results: ChatResponse[];

  constructor(response: ChatResponse) {
    super();
    this.results = [response];
  }

  static {
    this.register();
  }

  get messages() {
    return this.results.flatMap((response) =>
      BaseMessage.of({
        role: response.message.role,
        text: response.message.content,
      }),
    );
  }

  getTextContent(): string {
    return this.finalResult.message.content;
  }

  @Cache()
  get finalResult(): Readonly<ChatResponse> {
    if (this.results.length === 0) {
      throw new LLMOutputError("No chunks to get final result from!");
    }

    return customMerge(this.results, {
      message: (value, oldValue) => ({
        role: value.role ?? oldValue.role,
        content: `${oldValue?.content ?? ""}${value?.content ?? ""}`,
        images: [...(oldValue?.images ?? []), ...(value?.images ?? [])] as string[],
        tool_calls: [...(oldValue?.tool_calls ?? []), ...(value?.tool_calls ?? [])],
      }),
      total_duration: (value, oldValue) => value ?? oldValue,
      load_duration: (value, oldValue) => value ?? oldValue,
      model: (value, oldValue) => value ?? oldValue,
      done: (value, oldValue) => value ?? oldValue,
      done_reason: (value, oldValue) => value ?? oldValue,
      created_at: (value, oldValue) => value ?? oldValue,
      eval_duration: (value, oldValue) => value ?? oldValue,
      prompt_eval_duration: (value, oldValue) => value ?? oldValue,
      prompt_eval_count: safeSum,
      eval_count: safeSum,
    });
  }

  merge(other: OllamaChatLLMOutput): void {
    Cache.getInstance(this, "finalResult").clear();
    this.results.push(...other.results);
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      results: shallowCopy(this.results),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}

interface Input {
  modelId: string;
  client?: Client;
  parameters?: Partial<Parameters>;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<OllamaChatLLMOutput>;
}

export type OllamaChatLLMEvents = ChatLLMGenerateEvents<OllamaChatLLMOutput>;

export class OllamaChatLLM extends ChatLLM<OllamaChatLLMOutput> {
  public readonly emitter = Emitter.root.child<OllamaChatLLMEvents>({
    namespace: ["ollama", "chat_llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<Parameters>;

  constructor(
    { client, modelId, parameters, executionOptions = {}, cache }: Input = {
      modelId: "llama3.1",
    },
  ) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client({ fetch, host: getEnv("OLLAMA_HOST") });
    this.parameters = parameters ?? {
      temperature: 0,
      repeat_penalty: 1.0,
      num_predict: 2048,
    };
  }

  static {
    this.register();
    registerClient();
  }

  async meta() {
    const model = await this.client.show({
      model: this.modelId,
    });

    return extractModelMeta(model);
  }

  async embed(
    input: BaseMessage[][],
    options: OllamaEmbeddingOptions = {},
  ): Promise<EmbeddingOutput> {
    const response = await this.client.embed({
      model: this.modelId,
      input: input.flatMap((messages) => messages).flatMap((msg) => msg.text),
      options: options?.options,
      truncate: options?.truncate,
    });
    return { embeddings: response.embeddings };
  }

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const contentLength = input.reduce((acc, msg) => acc + msg.text.length, 0);

    return {
      tokensCount: Math.ceil(contentLength / 4),
    };
  }

  @Cache()
  async version() {
    const config = getPropStrict(this.client, "config") as Config;
    return retrieveVersion(config.host, config.fetch);
  }

  protected async _generate(
    input: BaseMessage[],
    options: GenerateOptions,
    run: GetRunContext<typeof this>,
  ): Promise<OllamaChatLLMOutput> {
    const response = await signalRace(
      async () =>
        this.client.chat({
          ...(await this.prepareParameters(input, options)),
          stream: false,
        }),
      run.signal,
      () => this.client.abort(),
    );

    return new OllamaChatLLMOutput(response);
  }

  protected async *_stream(
    input: BaseMessage[],
    options: Partial<StreamGenerateOptions>,
    run: GetRunContext<typeof this>,
  ): AsyncStream<OllamaChatLLMOutput> {
    for await (const chunk of await this.client.chat({
      ...(await this.prepareParameters(input, options)),
      stream: true,
    })) {
      if (run.signal.aborted) {
        break;
      }
      yield new OllamaChatLLMOutput(chunk);
    }
    run.signal.throwIfAborted();
  }

  protected async prepareParameters(
    input: BaseMessage[],
    overrides?: GenerateOptions,
  ): Promise<ChatRequest> {
    return {
      model: this.modelId,
      messages: input.map((msg) => ({
        role: msg.role,
        content: msg.text,
      })),
      options: this.parameters,
      format: retrieveFormat(await this.version(), overrides?.guided),
    };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      executionOptions: shallowCopy(this.executionOptions),
      client: this.client,
    };
  }
}
