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
  EmbeddingOptions,
  EmbeddingOutput,
  LLMCache,
  LLMError,
  StreamGenerateOptions,
} from "@/llms/base.js";
import { isFunction, isObjectType } from "remeda";
import {
  BAMLLM,
  BAMLLMGenerateOptions,
  BAMLLMParameters,
  BAMLLMOutput,
} from "@/adapters/bam/llm.js";
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { Cache } from "@/cache/decoratorCache.js";
import { BAMChatLLMPreset, BAMChatLLMPresetModel } from "@/adapters/bam/chatPreset.js";
import { Client } from "@ibm-generative-ai/node-sdk";
import { transformAsyncIterable } from "@/internals/helpers/stream.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";

export class BAMChatLLMOutput extends ChatLLMOutput {
  public readonly raw: BAMLLMOutput;

  constructor(rawOutput: BAMLLMOutput) {
    super();
    this.raw = rawOutput;
  }

  get finalResult() {
    return this.raw.finalResult;
  }

  @Cache()
  get messages(): BaseMessage[] {
    const text = this.raw.getTextContent();
    return [
      BaseMessage.of({
        role: "assistant",
        text,
        meta: this.raw.meta,
      }),
    ];
  }

  merge(other: BAMChatLLMOutput): void {
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

export interface BAMChatLLMInputConfig {
  messagesToPrompt: (messages: BaseMessage[]) => string;
}

export interface BAMChatLLMInput {
  llm: BAMLLM;
  config: BAMChatLLMInputConfig;
  cache?: LLMCache<BAMChatLLMOutput>;
}

export type BAMChatLLMEvents = ChatLLMGenerateEvents<BAMChatLLMOutput>;

export class BAMChatLLM extends ChatLLM<BAMChatLLMOutput> {
  public readonly emitter = Emitter.root.child<BAMChatLLMEvents>({
    namespace: ["bam", "chat_llm"],
    creator: this,
  });

  public readonly llm: BAMLLM;
  protected readonly config: BAMChatLLMInputConfig;

  constructor({ llm, config, cache }: BAMChatLLMInput) {
    super(llm.modelId, llm.executionOptions, cache);
    this.llm = llm;
    this.config = config;
  }

  static {
    this.register();
  }

  async meta() {
    return this.llm.meta();
  }

  async embed(input: BaseMessage[][], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    const inputs = input.map((messages) => this.messagesToPrompt(messages));
    return this.llm.embed(inputs, options);
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      executionOptions: shallowCopy(this.executionOptions),
      llm: this.llm,
      config: shallowCopy(this.config),
    };
  }

  async tokenize(messages: BaseMessage[]) {
    const prompt = this.messagesToPrompt(messages);
    return this.llm.tokenize(prompt);
  }

  protected async _generate(
    messages: BaseMessage[],
    options: BAMLLMGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): Promise<BAMChatLLMOutput> {
    const prompt = this.messagesToPrompt(messages);
    // @ts-expect-error protected property
    const rawResponse = await this.llm._generate(prompt, options, run);
    return new BAMChatLLMOutput(rawResponse);
  }

  protected async *_stream(
    messages: BaseMessage[],
    options: StreamGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): AsyncStream<BAMChatLLMOutput, void> {
    const prompt = this.messagesToPrompt(messages);
    // @ts-expect-error protected property
    const response = this.llm._stream(prompt, options, run);
    return yield* transformAsyncIterable(response, (output) => new BAMChatLLMOutput(output));
  }

  messagesToPrompt(messages: BaseMessage[]) {
    return this.config.messagesToPrompt(messages);
  }

  static fromPreset(
    modelId: BAMChatLLMPresetModel,
    overrides?: {
      client?: Client;
      parameters?: BAMLLMParameters | ((value: BAMLLMParameters) => BAMLLMParameters);
    },
  ) {
    const presetFactory = BAMChatLLMPreset[modelId];
    if (!presetFactory) {
      throw new LLMError(`Model "${modelId}" does not exist in preset.`);
    }

    const preset = presetFactory();
    let parameters = preset.base.parameters ?? {};
    if (isFunction(overrides?.parameters)) {
      parameters = overrides?.parameters(parameters);
    } else if (isObjectType(overrides?.parameters)) {
      parameters = overrides?.parameters;
    }

    return new BAMChatLLM({
      config: preset.chat,
      llm: new BAMLLM({
        ...preset.base,
        ...overrides,
        parameters,
        client: overrides?.client ?? new Client(),
        modelId,
      }),
    });
  }
}
