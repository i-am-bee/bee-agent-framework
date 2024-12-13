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
  BaseLLMOutput,
  BaseLLMTokenizeOutput,
  EmbeddingOptions,
  EmbeddingOutput,
  ExecutionOptions,
  GenerateOptions,
  GuidedOptions,
  LLMCache,
  LLMError,
  LLMMeta,
} from "@/llms/base.js";
import { chunk, isEmpty, isString } from "remeda";
import type {
  DecodingParameters,
  SingleGenerationRequest,
  EmbeddingTasksRequest,
} from "@/adapters/ibm-vllm/types.js";
import { LLM, LLMEvents, LLMInput } from "@/llms/llm.js";
import { Emitter } from "@/emitter/emitter.js";
import { GenerationResponse__Output } from "@/adapters/ibm-vllm/types.js";
import { shallowCopy } from "@/serializer/utils.js";
import { FrameworkError, NotImplementedError } from "@/errors.js";
import { assign, omitUndefined } from "@/internals/helpers/object.js";
import { ServiceError } from "@grpc/grpc-js";
import { Client } from "@/adapters/ibm-vllm/client.js";
import { GetRunContext } from "@/context.js";
import { BatchedGenerationRequest } from "./types.js";
import { OmitPrivateKeys } from "@/internals/types.js";

function isGrpcServiceError(err: unknown): err is ServiceError {
  return (
    err instanceof Error &&
    err.constructor.name === "Error" &&
    "code" in err &&
    typeof err.code === "number"
  );
}

export class IBMvLLMOutput extends BaseLLMOutput {
  constructor(
    public text: string,
    public readonly meta: Record<string, any>,
  ) {
    super();
  }

  static {
    this.register();
  }

  merge(other: IBMvLLMOutput): void {
    this.text += other.text;
    assign(this.meta, other.meta);
  }

  getTextContent(): string {
    return this.text;
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      text: this.text,
      meta: shallowCopy(this.meta),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export interface IBMvLLMInput {
  client?: Client;
  modelId: string;
  parameters?: IBMvLLMParameters;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<IBMvLLMOutput>;
}

export type IBMvLLMParameters = NonNullable<
  BatchedGenerationRequest["params"] & SingleGenerationRequest["params"]
>;

export interface IBMvLLMGenerateOptions extends GenerateOptions {}

export interface IBMvLLMEmbeddingOptions
  extends EmbeddingOptions,
    Omit<OmitPrivateKeys<EmbeddingTasksRequest>, "texts"> {
  chunkSize?: number;
}

export type IBMvLLMEvents = LLMEvents<IBMvLLMOutput>;

export class IBMvLLM extends LLM<IBMvLLMOutput, IBMvLLMGenerateOptions> {
  public readonly emitter = new Emitter<IBMvLLMEvents>({
    namespace: ["ibm_vllm", "llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<IBMvLLMParameters>;

  constructor({ client, modelId, parameters = {}, executionOptions, cache }: IBMvLLMInput) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client();
    this.parameters = parameters ?? {};
  }

  static {
    this.register();
  }

  async meta(): Promise<LLMMeta> {
    const response = await this.client.modelInfo({ model_id: this.modelId });
    return {
      tokenLimit: response.max_sequence_length,
    };
  }

  async embed(
    input: LLMInput[],
    { chunkSize, signal, ...options }: IBMvLLMEmbeddingOptions = {},
  ): Promise<EmbeddingOutput> {
    const results = await Promise.all(
      chunk(input, chunkSize ?? 100).map(async (texts) => {
        const response = await this.client.embed(
          {
            model_id: this.modelId,
            truncate_input_tokens: options?.truncate_input_tokens ?? 512,
            texts,
          },
          {
            signal,
          },
        );
        const embeddings = response.results?.vectors.map((vector) => {
          const embedding = vector[vector.data]?.values;
          if (!embedding) {
            throw new LLMError("Missing embedding");
          }
          return embedding;
        });
        if (embeddings?.length !== texts.length) {
          throw new LLMError("Missing embedding");
        }
        return embeddings;
      }),
    );
    return { embeddings: results.flat() };
  }

  async tokenize(input: LLMInput): Promise<BaseLLMTokenizeOutput> {
    try {
      const response = await this.client.tokenize({
        model_id: this.modelId,
        requests: [{ text: input }],
      });
      const output = response.responses.at(0);
      if (!output) {
        throw new LLMError("Missing output", [], { context: { response } });
      }
      return {
        tokens: output.tokens,
        tokensCount: output.token_count,
      };
    } catch (err) {
      throw this._transformError(err);
    }
  }

  protected async _generate(
    input: LLMInput,
    options: IBMvLLMGenerateOptions | undefined,
    run: GetRunContext<this>,
  ): Promise<IBMvLLMOutput> {
    try {
      const response = await this.client.generate(
        {
          model_id: this.modelId,
          requests: [{ text: input }],
          params: this._prepareParameters(options),
        },
        { signal: run.signal },
      );
      const output = response.responses.at(0);
      if (!output) {
        throw new LLMError("Missing output", [], { context: { response } });
      }

      const { text, ...rest } = output;
      return new IBMvLLMOutput(text, rest);
    } catch (err) {
      throw this._transformError(err);
    }
  }

  protected async *_stream(
    input: string,
    options: IBMvLLMGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): AsyncStream<IBMvLLMOutput> {
    try {
      const stream = await this.client.generateStream(
        {
          model_id: this.modelId,
          request: { text: input },
          params: this._prepareParameters(options),
        },
        { signal: run.signal },
      );
      for await (const chunk of stream) {
        const typedChunk = chunk as GenerationResponse__Output;
        const { text, ...rest } = typedChunk;
        if (text.length > 0) {
          yield new IBMvLLMOutput(text, rest);
        }
      }
    } catch (err) {
      throw this._transformError(err);
    }
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      client: this.client,
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      executionOptions: shallowCopy(this.executionOptions),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(snapshot);
    Object.assign(this, snapshot);
  }

  protected _transformError(error: Error): Error {
    if (error instanceof FrameworkError) {
      throw error;
    }
    if (isGrpcServiceError(error)) {
      throw new LLMError("LLM has occurred an error!", [error], {
        isRetryable: [8, 4, 14].includes(error.code),
      });
    }
    return new LLMError("LLM has occurred an error!", [error]);
  }

  protected _prepareParameters(overrides?: GenerateOptions): typeof this.parameters {
    const guided: DecodingParameters = omitUndefined(
      overrides?.guided ? {} : (this.parameters.decoding ?? {}),
    );
    const guidedOverride: GuidedOptions = omitUndefined(overrides?.guided ?? {});

    if (guidedOverride?.choice) {
      guided.choice = { ...guided.choice, choices: guidedOverride.choice };
    } else if (guidedOverride?.grammar) {
      guided.grammar = guidedOverride.grammar;
    } else if (guidedOverride?.json) {
      guided.json_schema = isString(guidedOverride.json)
        ? guidedOverride.json
        : JSON.stringify(guidedOverride.json);
    } else if (guidedOverride?.regex) {
      guided.regex = guidedOverride.regex;
    } else if (!isEmpty(guidedOverride ?? {})) {
      throw new NotImplementedError(
        `Following types ${Object.keys(overrides!.guided!).join(",")}" for the constraint decoding are not supported!`,
      );
    }

    return {
      ...this.parameters,
      decoding: guided,
    };
  }
}
