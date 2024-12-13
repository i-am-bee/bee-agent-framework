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

import { isFunction, isObjectType } from "remeda";

import {
  IBMvLLM,
  IBMvLLMEmbeddingOptions,
  IBMvLLMGenerateOptions,
  IBMvLLMOutput,
  IBMvLLMParameters,
} from "./llm.js";

import { Cache } from "@/cache/decoratorCache.js";
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { Emitter } from "@/emitter/emitter.js";
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import {
  AsyncStream,
  BaseLLMTokenizeOutput,
  EmbeddingOutput,
  LLMCache,
  LLMError,
  LLMMeta,
} from "@/llms/base.js";
import { transformAsyncIterable } from "@/internals/helpers/stream.js";
import { shallowCopy } from "@/serializer/utils.js";
import { IBMVllmChatLLMPreset, IBMVllmChatLLMPresetModel } from "@/adapters/ibm-vllm/chatPreset.js";
import { Client } from "./client.js";
import { GetRunContext } from "@/context.js";

export class GrpcChatLLMOutput extends ChatLLMOutput {
  public readonly raw: IBMvLLMOutput;

  constructor(rawOutput: IBMvLLMOutput) {
    super();
    this.raw = rawOutput;
  }

  @Cache()
  get messages(): BaseMessage[] {
    const text = this.raw.getTextContent();
    return [
      BaseMessage.of({
        role: Role.ASSISTANT,
        text,
        meta: this.raw.meta,
      }),
    ];
  }

  merge(other: GrpcChatLLMOutput): void {
    Cache.getInstance(this, "messages").clear();
    this.raw.merge(other.raw);
  }

  getTextContent(): string {
    const [message] = this.messages;
    return message.text;
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      raw: shallowCopy(this.raw),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export interface IBMVllmInputConfig {
  messagesToPrompt: (messages: BaseMessage[]) => string;
}

export interface GrpcChatLLMInput {
  llm: IBMvLLM;
  config: IBMVllmInputConfig;
  cache?: LLMCache<GrpcChatLLMOutput>;
}

export type IBMVllmChatEvents = ChatLLMGenerateEvents<GrpcChatLLMOutput>;

export class IBMVllmChatLLM extends ChatLLM<GrpcChatLLMOutput> {
  public readonly emitter = new Emitter<IBMVllmChatEvents>({
    namespace: ["ibm_vllm", "chat_llm"],
    creator: this,
  });

  public readonly llm: IBMvLLM;
  protected readonly config: IBMVllmInputConfig;

  constructor({ llm, config, cache }: GrpcChatLLMInput) {
    super(llm.modelId, llm.executionOptions, cache);
    this.llm = llm;
    this.config = config;
  }

  static {
    this.register();
  }

  async meta(): Promise<LLMMeta> {
    return this.llm.meta();
  }

  async embed(input: BaseMessage[][], options?: IBMvLLMEmbeddingOptions): Promise<EmbeddingOutput> {
    const inputs = input.map((messages) => this.messagesToPrompt(messages));
    return this.llm.embed(inputs, options);
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      executionOptions: this.executionOptions,
      llm: this.llm,
      config: shallowCopy(this.config),
    };
  }

  async tokenize(messages: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const prompt = this.messagesToPrompt(messages);
    return this.llm.tokenize(prompt);
  }

  protected async _generate(
    messages: BaseMessage[],
    options: IBMvLLMGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): Promise<GrpcChatLLMOutput> {
    const prompt = this.messagesToPrompt(messages);
    // @ts-expect-error protected property
    const rawResponse = await this.llm._generate(prompt, options, run);
    return new GrpcChatLLMOutput(rawResponse);
  }

  protected async *_stream(
    messages: BaseMessage[],
    options: IBMvLLMGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): AsyncStream<GrpcChatLLMOutput, void> {
    const prompt = this.messagesToPrompt(messages);
    // @ts-expect-error protected property
    const response = this.llm._stream(prompt, options, run);
    return yield* transformAsyncIterable(response, (output) => new GrpcChatLLMOutput(output));
  }

  messagesToPrompt(messages: BaseMessage[]) {
    return this.config.messagesToPrompt(messages);
  }

  static fromPreset(
    modelId: IBMVllmChatLLMPresetModel,
    overrides?: {
      client?: Client;
      parameters?: IBMvLLMParameters | ((value: IBMvLLMParameters) => IBMvLLMParameters);
    },
  ) {
    const presetFactory = IBMVllmChatLLMPreset[modelId];
    if (!presetFactory) {
      throw new LLMError(`Model "${modelId}" does not exist in preset.`);
    }

    const preset = presetFactory();
    let parameters = preset.base.parameters ?? {};
    if (overrides) {
      if (isFunction(overrides.parameters)) {
        parameters = overrides.parameters(parameters);
      } else if (isObjectType(overrides.parameters)) {
        parameters = overrides.parameters;
      }
    }

    return new IBMVllmChatLLM({
      config: preset.chat,
      llm: new IBMvLLM({
        ...preset.base,
        ...overrides,
        parameters,
        modelId,
      }),
    });
  }
}
