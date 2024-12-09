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
import { BaseLLM as LCBaseLLM } from "@langchain/core/language_models/llms";
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
import { load } from "@langchain/core/load";
import { assign } from "@/internals/helpers/object.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";
import { NotImplementedError } from "@/errors.js";

export class LangChainLLMOutput extends BaseLLMOutput {
  constructor(
    public text: string,
    public readonly meta: Record<string, any>,
  ) {
    super();
  }

  static {
    this.register();
  }

  merge(other: LangChainLLMOutput): void {
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

export type LangChainLLMEvents = LLMEvents<LangChainLLMOutput>;

export class LangChainLLM extends LLM<LangChainLLMOutput> {
  public readonly emitter = Emitter.root.child<LangChainLLMEvents>({
    namespace: ["langchain", "llm"],
    creator: this,
  });
  protected readonly parameters: any;

  constructor(
    public readonly lcLLM: LCBaseLLM,
    private modelMeta?: LLMMeta,
    executionOptions?: ExecutionOptions,
    cache?: LLMCache<LangChainLLMOutput>,
  ) {
    super(lcLLM._modelType(), executionOptions, cache);
    this.parameters = lcLLM.invocationParams();
  }

  static {
    this.register();
  }

  async meta() {
    if (this.modelMeta) {
      return this.modelMeta;
    }

    return {
      tokenLimit: Infinity,
    };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async embed(input: LLMInput[], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    throw new NotImplementedError();
  }

  async tokenize(input: LLMInput): Promise<BaseLLMTokenizeOutput> {
    return {
      tokensCount: await this.lcLLM.getNumTokens(input),
    };
  }

  protected async _generate(
    input: LLMInput,
    _options: Partial<GenerateOptions>,
    run: GetRunContext<this>,
  ): Promise<LangChainLLMOutput> {
    const { generations } = await this.lcLLM.generate([input], {
      signal: run.signal,
    });
    return new LangChainLLMOutput(generations[0][0].text, generations[0][0].generationInfo || {});
  }

  protected async *_stream(
    input: string,
    _options: StreamGenerateOptions | undefined,
    run: GetRunContext<this>,
  ): AsyncStream<LangChainLLMOutput> {
    const response = this.lcLLM._streamResponseChunks(input, {
      signal: run.signal,
    });
    for await (const chunk of response) {
      yield new LangChainLLMOutput(chunk.text, chunk.generationInfo || {});
    }
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      modelMeta: this.modelMeta,
      parameters: shallowCopy(this.parameters),
      executionOptions: shallowCopy(this.executionOptions),
      lcLLM: JSON.stringify(this.lcLLM.toJSON()),
    };
  }

  async loadSnapshot({ lcLLM, ...state }: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(state);
    Object.assign(this, state, {
      lcLLM: await (async () => {
        if (lcLLM.includes("@ibm-generative-ai/node-sdk")) {
          const { GenAIModel } = await import("@ibm-generative-ai/node-sdk/langchain");
          return GenAIModel.fromJSON(lcLLM);
        }

        return await load(lcLLM);
      })(),
    });
  }
}
