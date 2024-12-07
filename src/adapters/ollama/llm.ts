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

import { LLM, LLMEvents, LLMInput } from "@/llms/llm.js";
import { Emitter } from "@/emitter/emitter.js";
import {
  AsyncStream,
  BaseLLMOutput,
  BaseLLMTokenizeOutput,
  ExecutionOptions,
  GenerateOptions,
  LLMCache,
  LLMMeta,
  LLMOutputError,
  StreamGenerateOptions,
} from "@/llms/base.js";
import { GenerateResponse, Ollama as Client, Options as Parameters } from "ollama";
import { GetRunContext } from "@/context.js";
import { Cache } from "@/cache/decoratorCache.js";
import { safeSum } from "@/internals/helpers/number.js";
import { shallowCopy } from "@/serializer/utils.js";
import { signalRace } from "@/internals/helpers/promise.js";
import { customMerge } from "@/internals/helpers/object.js";
import { extractModelMeta, registerClient } from "@/adapters/ollama/shared.js";
import { getEnv } from "@/internals/env.js";

interface Input {
  modelId: string;
  client?: Client;
  parameters?: Partial<Parameters>;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<OllamaLLMOutput>;
}

export class OllamaLLMOutput extends BaseLLMOutput {
  public readonly results: GenerateResponse[];

  constructor(result: GenerateResponse) {
    super();
    this.results = [result];
  }

  static {
    this.register();
  }

  getTextContent(): string {
    return this.finalResult.response;
  }

  @Cache()
  get finalResult(): Readonly<GenerateResponse> {
    if (this.results.length === 0) {
      throw new LLMOutputError("No chunks to get final result from!");
    }

    return customMerge(this.results, {
      response: (value = "", oldValue = "") => oldValue + value,
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
      context: (value, oldValue) => [...(value || []), ...(oldValue || [])],
    });
  }

  merge(other: OllamaLLMOutput): void {
    Cache.getInstance(this, "finalResult").clear();
    this.results.push(...other.results);
  }

  createSnapshot() {
    return {
      results: shallowCopy(this.results),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  toString(): string {
    return this.getTextContent();
  }
}

export type OllamaLLMEvents = LLMEvents<OllamaLLMOutput>;

export class OllamaLLM extends LLM<OllamaLLMOutput> {
  public readonly emitter = Emitter.root.child<OllamaLLMEvents>({
    namespace: ["ollama", "llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<Parameters>;

  static {
    this.register();
    registerClient();
  }

  constructor({ client, modelId, parameters, executionOptions = {}, cache }: Input) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client({ host: getEnv("OLLAMA_HOST") });
    this.parameters = parameters ?? {};
  }

  protected async _generate(
    input: LLMInput,
    options: GenerateOptions,
    run: GetRunContext<typeof this>,
  ): Promise<OllamaLLMOutput> {
    const response = await signalRace(
      () =>
        this.client.generate({
          model: this.modelId,
          stream: false,
          raw: true,
          prompt: input,
          options: this.parameters,
          format: options.guided?.json ? "json" : undefined,
        }),
      run.signal,
      () => this.client.abort(),
    );

    return new OllamaLLMOutput(response);
  }

  protected async *_stream(
    input: LLMInput,
    options: StreamGenerateOptions,
    run: GetRunContext<typeof this>,
  ): AsyncStream<OllamaLLMOutput, void> {
    for await (const chunk of await this.client.generate({
      model: this.modelId,
      stream: true,
      raw: true,
      prompt: input,
      options: this.parameters,
      format: options.guided?.json ? "json" : undefined,
    })) {
      if (run.signal.aborted) {
        break;
      }
      yield new OllamaLLMOutput(chunk);
    }
    run.signal.throwIfAborted();
  }

  async meta(): Promise<LLMMeta> {
    const model = await this.client.show({
      model: this.modelId,
    });

    return extractModelMeta(model);
  }

  async tokenize(input: LLMInput): Promise<BaseLLMTokenizeOutput> {
    return {
      tokensCount: Math.ceil(input.length / 4),
    };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      executionOptions: shallowCopy(this.executionOptions),
      parameters: shallowCopy(this.parameters),
      client: this.client,
    };
  }
}
