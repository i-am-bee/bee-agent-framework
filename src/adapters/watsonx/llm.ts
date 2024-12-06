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
  LLMCache,
  LLMError,
  LLMFatalError,
  LLMMeta,
  LLMOutputError,
} from "@/llms/base.js";
import { HttpError } from "@ibm-generative-ai/node-sdk";
import * as R from "remeda";
import { FrameworkError, ValueError } from "@/errors.js";
import { Cache, CacheFn } from "@/cache/decoratorCache.js";
import { shallowCopy } from "@/serializer/utils.js";
import { safeSum } from "@/internals/helpers/number.js";
import { omitUndefined } from "@/internals/helpers/object.js";
import { createURLParams, RestfulClient, RestfulClientError } from "@/internals/fetcher.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";
import { getEnv } from "@/internals/env.js";

export interface WatsonXLLMOutputMeta {
  model_id: string;
  created_at: string;
}

export interface WatsonXLLMOutputResult {
  generated_text: string;
  generated_token_count: number;
  input_token_count: number;
  stop_reason?: string;
}

export interface WatsonXLLMOutputConstructor {
  meta: WatsonXLLMOutputMeta;
  results: WatsonXLLMOutputResult[];
  system: Record<string, Record<string, any>[]>;
}

export class WatsonXLLMOutput extends BaseLLMOutput {
  public readonly meta: WatsonXLLMOutputMeta;
  public readonly results: WatsonXLLMOutputResult[];

  constructor(content: WatsonXLLMOutputConstructor) {
    super();
    this.meta = content.meta;
    this.results = content.results;
  }

  static {
    this.register();
  }

  getTextContent(): string {
    return this.finalResult.generated_text;
  }

  @Cache()
  get finalResult(): Readonly<WatsonXLLMOutputResult> {
    if (this.results.length === 0) {
      throw new LLMOutputError("No chunks to get final result from!");
    }

    const processors: {
      [K in keyof WatsonXLLMOutputResult]: (
        value: WatsonXLLMOutputResult[K],
        oldValue: WatsonXLLMOutputResult[K],
      ) => WatsonXLLMOutputResult[K];
    } = {
      generated_text: (value = "", oldValue = "") => oldValue + value,
      input_token_count: safeSum,
      generated_token_count: safeSum,
      stop_reason: (value, oldValue) => value ?? oldValue,
    };

    const finalResult = {} as WatsonXLLMOutputResult;
    for (const next of this.results) {
      for (const [key, value] of R.entries(next)) {
        const oldValue = finalResult[key];
        // @ts-expect-error weak typing due to  generated types
        finalResult[key] = (processors[key] ?? takeFirst)(value, oldValue);
      }
    }

    return finalResult;
  }

  merge(other: WatsonXLLMOutput): void {
    Cache.getInstance(this, "finalResult").clear();

    this.results.push(...other.results);
    Object.assign(this.meta, omitUndefined(other.meta));
  }

  createSnapshot() {
    return {
      results: shallowCopy(this.results),
      meta: shallowCopy(this.meta),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  toString(): string {
    return this.getTextContent();
  }
}

export interface WatsonXLLMParameters extends GenerateOptions {
  [key: string]: any;
  decoding_method?: "sample" | "greedy";
  length_penalty?: {
    decay_factor?: number;
    start_index?: number;
  };
  max_new_tokens?: number;
  min_new_tokens?: number;
  random_seed?: number;
  stop_sequences?: string[];
  temperature?: number;
  time_limit?: number;
  top_k?: number;
  top_p?: number;
  repetition_penalty?: number;
  truncate_input_tokens?: number;
  return_options?: {
    input_text?: boolean;
    generated_tokens?: boolean;
    input_tokens?: boolean;
    token_logprobs?: boolean;
    token_ranks?: boolean;
    top_n_tokens?: boolean;
  };
  include_stop_sequence?: boolean;
  typical_p?: number;
  prompt_variables?: Record<string, any>;
}
export type WatsonXLLMModerations = Record<string, any>;

export interface WatsonXLLMGenerateOptions extends GenerateOptions {
  parameters?: WatsonXLLMParameters;
  moderations?: WatsonXLLMModerations;
}

export interface WatsonXLLMInput {
  modelId: string;
  projectId?: string;
  spaceId?: string;
  deploymentId?: string;
  version?: string;
  apiKey?: string;
  accessToken?: string;
  baseUrl?: string;
  authBaseUrl?: string;
  region?: string;
  parameters?: WatsonXLLMParameters;
  moderations?: WatsonXLLMModerations;
  executionOptions?: ExecutionOptions;
  transform?: WatsonXLLMTransformFn;
  cache?: LLMCache<WatsonXLLMOutput>;
}

type WatsonXLLMTransformFn = (body: Record<string, any>) => Record<string, any>;

function createApiClient({
  deploymentId,
  apiKey,
  baseUrl,
  authBaseUrl = "https://iam.cloud.ibm.com",
  region,
  accessToken,
  version = "2023-05-02",
  projectId,
  spaceId,
}: WatsonXLLMInput) {
  region = region || getEnv("WATSONX_REGION") || "us-south";

  const paths = (() => {
    const pathPrefix = deploymentId ? `/ml/v1/deployments/${deploymentId}` : "/ml/v1";
    const queryParams = createURLParams({
      version,
    });

    return {
      generate: `${pathPrefix}/text/generation?${queryParams}`,
      generate_stream: `${pathPrefix}/text/generation_stream?${queryParams}`,
      tokenization: `/ml/v1/text/tokenization?${queryParams}`,
      models: `/ml/v1/foundation_model_specs?${queryParams}`,
      deployment: deploymentId
        ? `/ml/v4/deployments/${deploymentId}?${createURLParams({ version, project_id: projectId, space_id: projectId ? undefined : spaceId })}`
        : "not_defined_endpoint",
      embeddings: "/ml/v1/text/embeddings",
    };
  })();

  if (accessToken && apiKey) {
    throw new ValueError(`Use either "accessToken" or "apiKey".`);
  } else if (!accessToken && !apiKey) {
    accessToken = getEnv("WATSONX_ACCESS_TOKEN");
    apiKey = accessToken ? undefined : getEnv("WATSONX_API_KEY");
  }

  if (!accessToken && !apiKey) {
    throw new ValueError(
      [
        `Neither "accessToken" nor "apiKey" has been provided.`,
        `Either set them directly or put them in ENV ("WATSONX_ACCESS_TOKEN" / "WATSONX_API_KEY")`,
      ].join("\n"),
    );
  }

  const getHeaders = CacheFn.create(async () => {
    const getAccessToken = async () => {
      if (accessToken) {
        return { ttl: Infinity, token: accessToken };
      }

      const response = await fetch(new URL("/identity/token", authBaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: createURLParams({
          grant_type: "urn:ibm:params:oauth:grant-type:apikey",
          apikey: apiKey,
        }),
      });

      if (!response.ok) {
        throw new RestfulClientError("Failed to retrieve an API token.", [], {
          context: response,
        });
      }

      const data = await response.json();
      if (!data?.access_token) {
        throw new RestfulClientError("Access Token was not found in the response.");
      }
      return { ttl: (data.expires_in - 60) * 1000, token: data.access_token as string };
    };

    const response = await getAccessToken();
    getHeaders.updateTTL(response.ttl);
    return new Headers({
      "Authorization": `Bearer ${response.token}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    });
  });

  return new RestfulClient({
    baseUrl: baseUrl || `https://${region}.ml.cloud.ibm.com`,
    paths,
    headers: getHeaders,
  });
}

export type WatsonXLLMEvents = LLMEvents<WatsonXLLMOutput>;

export class WatsonXLLM extends LLM<WatsonXLLMOutput, WatsonXLLMGenerateOptions> {
  public readonly emitter = Emitter.root.child<WatsonXLLMEvents>({
    namespace: ["watsonx", "llm"],
    creator: this,
  });

  public readonly client;
  protected projectId;
  protected deploymentId;
  protected spaceId;
  protected transform: WatsonXLLMTransformFn;
  public readonly moderations;
  public readonly parameters: WatsonXLLMParameters;

  constructor(input: WatsonXLLMInput) {
    super(input.modelId, input.executionOptions, input.cache);
    this.projectId = input.projectId;
    this.spaceId = input.spaceId;
    this.deploymentId = input.deploymentId;
    this.moderations = input.moderations;
    this.transform = input.transform ?? ((input) => input);
    this.client = createApiClient(input);
    this.parameters = input.parameters ?? {};
  }

  static {
    this.register();
  }

  @Cache()
  async meta(): Promise<LLMMeta> {
    let modelId = this.modelId;
    if (this.deploymentId) {
      const { entity } = await this.client.fetch("deployment");
      modelId = entity.base_model_id ?? modelId;
    }

    if (!modelId) {
      throw new LLMFatalError(`Cannot retrieve metadata for model '${modelId ?? "undefined"}'`);
    }

    const {
      resources: [model],
    } = await this.client.fetch("models", {
      searchParams: createURLParams({
        filters: `modelid_${modelId}`,
        limit: "1",
      }),
    });

    return {
      tokenLimit: model?.model_limits?.max_sequence_length ?? Infinity,
    };
  }

  async embed(input: LLMInput[], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    const response: { results: { embedding: number[] }[] } = await this.client.fetch("embeddings", {
      method: "POST",
      searchParams: new URLSearchParams({ version: "2023-10-25" }),
      body: JSON.stringify({
        inputs: input,
        model_id: this.modelId,
        project_id: this.projectId,
        parameters: {
          truncate_input_tokens: 512,
        },
      }),
      signal: options?.signal,
    });
    if (response.results?.length !== input.length) {
      throw new Error("Missing embedding");
    }
    const embeddings = response.results.map((result) => result.embedding);
    return { embeddings };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      spaceId: this.spaceId,
      deploymentId: this.deploymentId,
      projectId: this.projectId,
      parameters: shallowCopy(this.parameters),
      moderations: shallowCopy(this.moderations),
      executionOptions: shallowCopy(this.executionOptions),
      transform: this.transform,
      client: this.client,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
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
      const { result } = await this.client.fetch("tokenization", {
        method: "POST",
        body: JSON.stringify({
          input,
          model_id: this.modelId,
          project_id: this.projectId,
          space_id: this.projectId ? undefined : this.spaceId,
          parameters: {
            return_tokens: true,
          },
        }),
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
    options: WatsonXLLMGenerateOptions | undefined,
    run: GetRunContext<this>,
  ): Promise<WatsonXLLMOutput> {
    try {
      const response = await this.client.fetch("generate", {
        method: "POST",
        body: JSON.stringify(
          this.transform({
            input,
            ...(!this.deploymentId && {
              model_id: this.modelId,
              project_id: this.projectId,
              space_id: this.projectId ? undefined : this.spaceId,
            }),
            parameters: options?.parameters ?? this.parameters,
            moderations: options?.moderations ?? this.moderations,
          }),
        ),
        signal: run.signal,
      });
      return this._rawResponseToOutput(response);
    } catch (e) {
      throw this._transformError(e);
    }
  }

  protected async *_stream(
    input: LLMInput,
    options: WatsonXLLMGenerateOptions | undefined,
    run: GetRunContext<this>,
  ): AsyncStream<WatsonXLLMOutput, void> {
    try {
      const response = this.client.stream("generate_stream", {
        method: "POST",
        body: JSON.stringify(
          this.transform({
            input,
            ...(!this.deploymentId && {
              model_id: this.modelId,
              project_id: this.projectId,
              space_id: this.projectId ? undefined : this.spaceId,
            }),
            parameters: options?.parameters ?? this.parameters,
            moderations: options?.moderations ?? this.moderations,
          }),
        ),
        signal: run.signal,
      });

      for await (const msg of response) {
        const content = JSON.parse(msg.data);
        yield this._rawResponseToOutput(content);
      }
    } catch (e) {
      throw this._transformError(e);
    }
  }

  protected _rawResponseToOutput(raw: any) {
    return new WatsonXLLMOutput({
      results: raw.results ?? [],
      meta: R.pickBy(
        {
          model_id: raw.model_id,
          created_at: raw.created_at!,
        },
        R.isDefined,
      ),
      system: raw.system ?? [],
    });
  }
}
