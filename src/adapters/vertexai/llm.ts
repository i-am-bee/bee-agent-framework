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
  LLMMeta,
  StreamGenerateOptions,
} from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import type { GetRunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";
import { VertexAI, BaseModelParams as Params } from "@google-cloud/vertexai";
import { Role } from "@/llms/primitives/message.js";
import { signalRace } from "@/internals/helpers/promise.js";
import { processContentResponse, getTokenCount, registerVertexAI, createModel } from "./utils.js";
import { NotImplementedError } from "@/errors.js";

interface VertexAILLMChunk {
  text: string;
  metadata: Record<string, any>;
}

export class VertexAILLMOutput extends BaseLLMOutput {
  public readonly chunks: VertexAILLMChunk[] = [];

  constructor(chunk: VertexAILLMChunk) {
    super();
    this.chunks.push(chunk);
  }

  merge(other: VertexAILLMOutput): void {
    this.chunks.push(...other.chunks);
  }

  getTextContent(): string {
    return this.chunks.map((result) => result.text).join("");
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return { chunks: shallowCopy(this.chunks) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}

export interface VertexAILLMInput {
  modelId: string;
  project: string;
  location: string;
  client?: VertexAI;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<VertexAILLMOutput>;
  parameters?: Params;
}

export type VertexAILLMEvents = LLMEvents<VertexAILLMOutput>;

export class VertexAILLM extends LLM<VertexAILLMOutput> {
  public readonly emitter = Emitter.root.child<VertexAILLMEvents>({
    namespace: ["vertexai", "llm"],
    creator: this,
  });

  protected client: VertexAI;
  protected parameters?: Params;

  constructor(protected readonly input: VertexAILLMInput) {
    super(input.modelId, input.executionOptions, input.cache);
    this.parameters = input.parameters;
    this.client =
      input.client ?? new VertexAI({ project: input.project, location: input.location });
  }

  static {
    this.register();
    registerVertexAI();
  }

  async meta(): Promise<LLMMeta> {
    return { tokenLimit: Infinity };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async embed(input: LLMInput[], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    throw new NotImplementedError();
  }

  async tokenize(input: LLMInput): Promise<BaseLLMTokenizeOutput> {
    const generativeModel = createModel(this.client, this.modelId);
    const response = await generativeModel.countTokens({
      contents: [{ parts: [{ text: input }], role: Role.USER }],
    });
    return {
      tokensCount: response.totalTokens,
    };
  }

  protected async _generate(
    input: LLMInput,
    options: GenerateOptions,
    run: GetRunContext<this>,
  ): Promise<VertexAILLMOutput> {
    const generativeModel = createModel(
      this.client,
      this.modelId,
      options.guided?.json,
      this.parameters,
    );
    const responses = await signalRace(() => generativeModel.generateContent(input), run.signal);
    const result: VertexAILLMChunk = {
      text: processContentResponse(responses.response),
      metadata: { tokenCount: getTokenCount(responses.response) },
    };
    return new VertexAILLMOutput(result);
  }

  protected async *_stream(
    input: LLMInput,
    options: Partial<StreamGenerateOptions>,
    run: GetRunContext<this>,
  ): AsyncStream<VertexAILLMOutput, void> {
    const generativeModel = createModel(
      this.client,
      this.modelId,
      options?.guided?.json,
      this.parameters,
    );
    const response = await generativeModel.generateContentStream(input);
    for await (const chunk of response.stream) {
      if (options?.signal?.aborted) {
        break;
      }
      const result: VertexAILLMChunk = {
        text: processContentResponse(chunk),
        metadata: { tokenCount: getTokenCount(chunk) },
      };
      yield new VertexAILLMOutput(result);
    }
    run.signal.throwIfAborted();
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      input: shallowCopy(this.input),
      client: this.client,
      parameters: this.parameters,
    };
  }

  loadSnapshot({ input, ...snapshot }: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(snapshot);
    Object.assign(this, { input });
  }
}
