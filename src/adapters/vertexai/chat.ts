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
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { signalRace } from "@/internals/helpers/promise.js";
import { processContentResponse, registerVertexAI, createModel } from "./utils.js";
import { NotImplementedError } from "@/errors.js";

export class VertexAIChatLLMOutput extends ChatLLMOutput {
  public readonly chunks: BaseMessage[] = [];

  constructor(chunk: BaseMessage) {
    super();
    this.chunks.push(chunk);
  }

  get messages() {
    return this.chunks;
  }

  merge(other: VertexAIChatLLMOutput): void {
    this.chunks.push(...other.chunks);
  }

  getTextContent(): string {
    return this.chunks.map((result) => result.text).join("");
  }

  toString() {
    return this.getTextContent();
  }

  createSnapshot() {
    return { chunks: shallowCopy(this.chunks) };
  }

  loadSnapshot(snapshot: typeof this.createSnapshot): void {
    Object.assign(this, snapshot);
  }
}

export interface VertexAIChatLLMInput {
  modelId: string;
  project: string;
  location: string;
  client?: VertexAI;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<VertexAIChatLLMOutput>;
  parameters?: Params;
}

export type VertexAIChatLLMEvents = ChatLLMGenerateEvents<VertexAIChatLLMOutput>;

export class VertexAIChatLLM extends ChatLLM<VertexAIChatLLMOutput> {
  public readonly emitter = Emitter.root.child<VertexAIChatLLMEvents>({
    namespace: ["vertexai", "llm"],
    creator: this,
  });

  protected client: VertexAI;
  protected parameters?: Params;

  constructor(protected readonly input: VertexAIChatLLMInput) {
    super(input.modelId, input.executionOptions, input.cache);
    this.parameters = input.parameters;
    this.client = new VertexAI({ project: input.project, location: input.location });
  }

  static {
    this.register();
    registerVertexAI();
  }

  async meta(): Promise<LLMMeta> {
    return { tokenLimit: Infinity };
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async embed(input: BaseMessage[][], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    throw new NotImplementedError();
  }

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const generativeModel = createModel(this.client, this.modelId);
    const response = await generativeModel.countTokens({
      contents: input.map((msg) => ({ parts: [{ text: msg.text }], role: msg.role })),
    });
    return {
      tokensCount: response.totalTokens,
    };
  }

  protected async _generate(
    input: BaseMessage[],
    options: GenerateOptions,
    run: GetRunContext<this>,
  ): Promise<VertexAIChatLLMOutput> {
    const generativeModel = createModel(
      this.client,
      this.modelId,
      options.guided?.json,
      this.parameters,
    );
    const response = await signalRace(
      () =>
        generativeModel.generateContent({
          contents: input.map((msg) => ({ parts: [{ text: msg.text }], role: msg.role })),
        }),
      run.signal,
    );
    const result = BaseMessage.of({
      role: Role.ASSISTANT,
      text: processContentResponse(response.response),
    });
    return new VertexAIChatLLMOutput(result);
  }

  protected async *_stream(
    input: BaseMessage[],
    options: Partial<StreamGenerateOptions>,
    run: GetRunContext<this>,
  ): AsyncStream<VertexAIChatLLMOutput, void> {
    const generativeModel = createModel(
      this.client,
      this.modelId,
      options?.guided?.json,
      this.parameters,
    );
    const chat = generativeModel.startChat();
    const response = await chat.sendMessageStream(input.map((msg) => msg.text));
    for await (const chunk of response.stream) {
      if (options?.signal?.aborted) {
        break;
      }
      const result = BaseMessage.of({
        role: Role.ASSISTANT,
        text: processContentResponse(chunk),
      });
      yield new VertexAIChatLLMOutput(result);
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
}
