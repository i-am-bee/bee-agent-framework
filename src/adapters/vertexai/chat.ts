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
  ExecutionOptions,
  GenerateCallbacks,
  GenerateOptions,
  LLMCache,
  LLMMeta,
} from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import type { GetRunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";
import { VertexAI } from "@google-cloud/vertexai";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { signalRace } from "@/internals/helpers/promise.js";
import { processContentResponse, registerVertexAI, createModel } from "./utils.js";

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
  parameters?: Record<string, any>;
}

export class VertexAIChatLLM extends ChatLLM<VertexAIChatLLMOutput> {
  public readonly emitter: Emitter<GenerateCallbacks> = Emitter.root.child({
    namespace: ["vertexai", "llm"],
    creator: this,
  });

  protected client: VertexAI;

  constructor(protected readonly input: VertexAIChatLLMInput) {
    super(input.modelId, input.executionOptions, input.cache);
    this.client = new VertexAI({ project: input.project, location: input.location });
  }

  static {
    this.register();
    registerVertexAI();
  }

  async meta(): Promise<LLMMeta> {
    return { tokenLimit: Infinity };
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
    const generativeModel = createModel(this.client, this.modelId, options.guided?.json);
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
    options: GenerateOptions | undefined,
    run: GetRunContext<this>,
  ): AsyncStream<VertexAIChatLLMOutput, void> {
    const generativeModel = createModel(this.client, this.modelId, options?.guided?.json);
    const chat = generativeModel.startChat();
    const response = await chat.sendMessageStream(input.map((msg) => msg.text));
    for await (const chunk of await response.stream) {
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
    };
  }
}
