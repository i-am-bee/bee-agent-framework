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
  LLMOutputError,
} from "@/llms/base.js";
import {
  Client,
  TextGenerationCreateInput,
  TextGenerationCreateStreamInput,
  TextGenerationCreateStreamOutput,
  TextGenerationCreateOutput,
  HttpError,
} from "@ibm-generative-ai/node-sdk";
import * as R from "remeda";
import { ExcludeNonStringIndex } from "@/internals/types.js";
import { FrameworkError, NotImplementedError } from "@/errors.js";
import { Cache } from "@/cache/decoratorCache.js";
import { transformAsyncIterable } from "@/internals/helpers/stream.js";
import { shallowCopy } from "@/serializer/utils.js";
import { safeSum } from "@/internals/helpers/number.js";
import { customMerge, omitUndefined } from "@/internals/helpers/object.js";
import { chunk, isEmpty, isString } from "remeda";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";

export type BAMLLMOutputMeta = Omit<ExcludeNonStringIndex<TextGenerationCreateOutput>, "results">;

export type BAMLLMOutputResult = ExcludeNonStringIndex<
  TextGenerationCreateOutput["results"][number]
>;

export type BAMLLMOutputModeration = ExcludeNonStringIndex<
  TextGenerationCreateStreamOutput["moderations"]
>;

export interface BAMLLMOutputConstructor {
  meta: BAMLLMOutputMeta;
  results: BAMLLMOutputResult[];
  moderations?: BAMLLMOutputModeration | BAMLLMOutputModeration[];
}

export class BAMLLMOutput extends BaseLLMOutput {
  public readonly meta: BAMLLMOutputMeta;
  public readonly results: BAMLLMOutputResult[];
  public readonly moderations: BAMLLMOutputModeration[];

  constructor(content: BAMLLMOutputConstructor) {
    super();
    this.meta = content.meta;
    this.results = content.results;
    this.moderations = R.isArray(content.moderations)
      ? content.moderations
      : [content.moderations].filter(R.isDefined);
  }

  static {
    this.register();
  }

  getTextContent(): string {
    return this.finalResult.generated_text;
  }

  get finalModeration(): Readonly<BAMLLMOutputModeration> {
    return BAMLLMOutput._combineModerations(...this.moderations, this.finalResult.moderations);
  }

  @Cache()
  get finalResult(): Readonly<BAMLLMOutputResult> {
    if (this.results.length === 0) {
      throw new LLMOutputError("No chunks to get final result from!");
    }

    return customMerge(this.results, {
      generated_text: (value = "", oldValue = "") => oldValue + value,
      input_token_count: safeSum,
      generated_token_count: safeSum,
      input_text: (value, oldValue) => value ?? oldValue,
      generated_tokens: (value, oldValue) => [...(value || []), ...(oldValue || [])],
      seed: (value, oldValue) => value ?? oldValue,
      stop_reason: (value, oldValue) => value ?? oldValue,
      stop_sequence: (value, oldValue) => value ?? oldValue,
      input_tokens: (value, oldValue) => value ?? oldValue,
      moderations: (value, oldValue) =>
        value && oldValue ? BAMLLMOutput._combineModerations(oldValue, value) : (value ?? oldValue),
    });
  }

  merge(other: BAMLLMOutput): void {
    Cache.getInstance(this, "finalResult").clear();

    this.results.push(...other.results);
    this.moderations.push(...other.moderations);
    Object.assign(this.meta, omitUndefined(other.meta));
  }

  createSnapshot() {
    return {
      results: shallowCopy(this.results),
      moderations: shallowCopy(this.moderations),
      meta: shallowCopy(this.meta),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  toString(): string {
    return this.getTextContent();
  }

  protected static _combineModerations(...entries: BAMLLMOutputModeration[]) {
    const newModerations: NonNullable<BAMLLMOutputModeration> = {};
    for (const entry of entries) {
      for (const [key, records] of R.entries(entry ?? {})) {
        if (R.isEmpty(records)) {
          continue;
        }
        if (!newModerations[key]) {
          newModerations[key] = [];
        }
        newModerations[key]!.push(...records);
      }
    }
    return newModerations;
  }
}

export type BAMLLMParameters = NonNullable<
  TextGenerationCreateInput["parameters"] & TextGenerationCreateStreamInput["parameters"]
>;

export interface BAMLLMGenerateOptions extends GenerateOptions {
  moderations?: TextGenerationCreateInput["moderations"];
}

export interface BAMLLMInput {
  client?: Client;
  modelId: string;
  parameters?: BAMLLMParameters;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<BAMLLMOutput>;
}

export type BAMLLMEvents = LLMEvents<BAMLLMOutput>;

export class BAMLLM extends LLM<BAMLLMOutput, BAMLLMGenerateOptions> {
  public readonly emitter = Emitter.root.child<BAMLLMEvents>({
    namespace: ["bam", "llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<BAMLLMParameters>;

  constructor({ client, parameters, modelId, cache, executionOptions = {} }: BAMLLMInput) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client();
    this.parameters = parameters ?? {};
  }

  static {
    this.register();
  }

  async meta(): Promise<LLMMeta> {
    try {
      const { result } = await this.client.model.retrieve({
        id: this.modelId,
      });

      const tokenLimit = result.token_limits?.find?.((limit) => {
        if (this.parameters?.beam_width !== undefined) {
          return limit.token_limit !== undefined && limit.beam_width === this.parameters.beam_width;
        }
        return limit.token_limit !== undefined;
      });
      return {
        tokenLimit: tokenLimit?.token_limit ?? Infinity,
      };
    } catch {
      // TODO: remove once retrieval gets fixed on the API
      if (this.modelId === "meta-llama/llama-3-1-70b-instruct") {
        return {
          tokenLimit: 131_072,
        };
      } else if (this.modelId.includes("llama-3-70b-instruct")) {
        return {
          tokenLimit: 8196,
        };
      }

      return {
        tokenLimit: Infinity,
      };
    }
  }

  async embed(input: LLMInput[], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    const maxEmbeddingInputs = 20;
    const results = await Promise.all(
      chunk(input, maxEmbeddingInputs).map(async (texts) => {
        const response = await this.client.text.embedding.create(
          {
            model_id: this.modelId,
            input: texts,
            parameters: {
              truncate_input_tokens: true,
            },
          },
          { signal: options?.signal },
        );
        if (response.results?.length !== texts.length) {
          throw new Error("Missing embedding");
        }
        return response.results.map((result) => result.embedding);
      }),
    );
    return { embeddings: results.flat() };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      client: null,
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      executionOptions: shallowCopy(this.executionOptions),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
    Object.assign(this, snapshot, {
      client: snapshot?.client ?? new Client(), // TODO: serialize?
    });
  }

  protected _transformError(error: Error): Error {
    if (error instanceof FrameworkError) {
      throw error;
    }
    if (error instanceof HttpError) {
      throw new LLMError("LLM has occurred an error!", [error], {
        isRetryable: [408, 425, 429, 500, 503].includes(error.status_code),
      });
    }
    return new LLMError("LLM has occurred an error!", [error]);
  }

  async tokenize(input: LLMInput): Promise<BaseLLMTokenizeOutput> {
    try {
      const {
        results: [result],
      } = await this.client.text.tokenization.create({
        input,
        model_id: this.modelId,
        parameters: {
          return_options: {
            tokens: true,
          },
        },
      });

      return {
        tokensCount: result.token_count,
        tokens: result.tokens,
      };
    } catch (e) {
      throw this._transformError(e);
    }
  }

  protected async _generate(
    input: LLMInput,
    options: BAMLLMGenerateOptions,
    run: GetRunContext<typeof this>,
  ): Promise<BAMLLMOutput> {
    try {
      const response = await this.client.text.generation.create(
        {
          input,
          moderations: options?.moderations,
          model_id: this.modelId,
          parameters: this._prepareParameters(options),
        },
        {
          signal: run.signal,
        },
      );
      return this._rawResponseToOutput(response);
    } catch (e) {
      throw this._transformError(e);
    }
  }

  protected async *_stream(
    input: string,
    options: BAMLLMGenerateOptions,
    run: GetRunContext<typeof this>,
  ): AsyncStream<BAMLLMOutput, void> {
    try {
      const response = await this.client.text.generation.create_stream(
        {
          input,
          moderations: options?.moderations,
          model_id: this.modelId,
          parameters: this._prepareParameters(options),
        },
        {
          signal: run.signal,
        },
      );
      yield* transformAsyncIterable(
        response[Symbol.asyncIterator](),
        this._rawResponseToOutput.bind(this),
      );
    } catch (e) {
      throw this._transformError(e);
    }
  }

  protected _rawResponseToOutput(
    raw: TextGenerationCreateOutput | TextGenerationCreateStreamOutput,
  ) {
    const chunks = (raw.results ?? []) as BAMLLMOutputResult[];

    return new BAMLLMOutput({
      results: chunks,
      moderations: (raw as TextGenerationCreateStreamOutput)?.moderations,
      meta: R.pickBy(
        {
          id: raw.id!,
          model_id: raw.model_id,
          created_at: raw.created_at!,
          input_parameters: raw.input_parameters,
        },
        R.isDefined,
      ),
    });
  }

  protected _prepareParameters(overrides?: GenerateOptions): typeof this.parameters {
    const guided: BAMLLMParameters["guided"] = omitUndefined(
      overrides?.guided ? {} : (this.parameters.guided ?? {}),
    );
    const guidedOverride: GuidedOptions = omitUndefined(overrides?.guided ?? {});

    if (guidedOverride?.choice) {
      guided.choice = guidedOverride.choice;
    } else if (guidedOverride?.grammar) {
      guided.grammar = guidedOverride.grammar;
    } else if (guidedOverride?.json) {
      guided.json_schema = isString(guidedOverride.json)
        ? JSON.parse(guidedOverride.json)
        : guidedOverride.json;
    } else if (guidedOverride?.regex) {
      guided.regex = guidedOverride.regex;
    } else if (!isEmpty(guidedOverride ?? {})) {
      throw new NotImplementedError(
        `Following types ${Object.keys(overrides!.guided!).join(",")}" for the constraint decoding are not supported!`,
      );
    }

    return {
      ...this.parameters,
      guided: isEmpty(guided) ? undefined : guided,
    };
  }
}
