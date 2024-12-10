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
} from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import { load } from "@langchain/core/load";
import {
  BaseChatModel,
  BaseChatModelCallOptions,
} from "@langchain/core/language_models/chat_models";
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, Role, RoleType } from "@/llms/primitives/message.js";
import {
  BaseMessageChunk,
  BaseMessage as LCBaseMessage,
  ChatMessage as LCMChatMessage,
  MessageContentComplex,
  MessageContentText,
  MessageType,
} from "@langchain/core/messages";
import { Cache } from "@/cache/decoratorCache.js";
import { getProp, omitUndefined } from "@/internals/helpers/object.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";
import { NotImplementedError } from "@/errors.js";

export class LangChainChatLLMOutput extends ChatLLMOutput {
  constructor(
    public messages: BaseMessage[],
    public meta: Record<string, any> = {},
  ) {
    super();
  }

  static {
    this.register();
  }

  merge(other: LangChainChatLLMOutput): void {
    this.messages.push(...other.messages);
    Object.assign(this.meta, omitUndefined(other.meta));
  }

  getTextContent(): string {
    return this.messages.map((msg) => msg.text).join("");
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      messages: shallowCopy(this.messages),
      meta: shallowCopy(this.meta),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}

export type LangChainChatLLMParameters = Record<string, any>;
type MergedCallOptions<T> = { lc: T } & GenerateOptions;

export type LangChainChatLLMEvents = ChatLLMGenerateEvents<LangChainChatLLMOutput>;

export class LangChainChatLLM<
  CallOptions extends BaseChatModelCallOptions,
  OutputMessageType extends BaseMessageChunk,
> extends ChatLLM<LangChainChatLLMOutput, MergedCallOptions<CallOptions>> {
  public readonly emitter = Emitter.root.child<LangChainChatLLMEvents>({
    namespace: ["langchain", "chat_llm"],
    creator: this,
  });
  public readonly parameters: any;

  constructor(
    public readonly lcLLM: BaseChatModel<CallOptions, OutputMessageType>,
    protected modelMeta?: LLMMeta,
    executionOptions?: ExecutionOptions,
    cache?: LLMCache<LangChainChatLLMOutput>,
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
  async embed(input: BaseMessage[][], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    throw new NotImplementedError();
  }

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    return {
      tokensCount: await this.lcLLM.getNumTokens(input),
    };
  }

  @Cache()
  protected get mappers() {
    const roleMapper = new Map<MessageType | string, RoleType>([
      ["system", Role.SYSTEM],
      ["assistant", Role.ASSISTANT],
      ["ai", Role.ASSISTANT],
      ["generic", Role.ASSISTANT],
      ["function", Role.ASSISTANT],
      ["tool", Role.ASSISTANT],
      ["human", Role.USER],
      ["tool", Role.ASSISTANT],
    ]);

    return {
      toLCMessage(message: BaseMessage): LCBaseMessage {
        return new LCMChatMessage({
          role: message.role,
          content: message.text,
          response_metadata: message.meta,
        });
      },
      fromLCMessage(message: LCBaseMessage | LCMChatMessage): BaseMessage {
        const role: string = getProp(message, ["role"], message._getType());
        const text: string =
          typeof message.content === "string"
            ? message.content
            : message.content
                .filter(
                  (msg: MessageContentComplex): msg is MessageContentText => msg.type === "text",
                )
                .map((msg: MessageContentText) => msg.text)
                .join("\n");

        return BaseMessage.of({
          role: roleMapper.has(role) ? roleMapper.get(role)! : Role.ASSISTANT,
          text,
        });
      },
    };
  }

  protected async _generate(
    input: BaseMessage[],
    options: MergedCallOptions<CallOptions>,
    run: GetRunContext<typeof this>,
  ): Promise<LangChainChatLLMOutput> {
    const lcMessages = input.map((msg) => this.mappers.toLCMessage(msg));
    const response = await this.lcLLM.invoke(lcMessages, {
      ...options?.lc,
      signal: run.signal,
    });

    return new LangChainChatLLMOutput(
      [this.mappers.fromLCMessage(response)],
      response.response_metadata,
    );
  }

  protected async *_stream(
    input: BaseMessage[],
    options: MergedCallOptions<CallOptions>,
    run: GetRunContext<typeof this>,
  ): AsyncStream<LangChainChatLLMOutput> {
    const lcMessages = input.map((msg) => this.mappers.toLCMessage(msg));
    const response = this.lcLLM._streamResponseChunks(lcMessages, {
      ...options?.lc,
      signal: run.signal,
    });
    for await (const chunk of response) {
      yield new LangChainChatLLMOutput(
        [this.mappers.fromLCMessage(chunk.message)],
        chunk.message.response_metadata,
      );
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
          const { GenAIChatModel } = await import("@ibm-generative-ai/node-sdk/langchain");
          return GenAIChatModel.fromJSON(lcLLM);
        }

        return await load(lcLLM);
      })(),
    });
  }
}
