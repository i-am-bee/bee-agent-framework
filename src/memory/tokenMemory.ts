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

import { BaseMessage } from "@/llms/primitives/message.js";
import { BaseMemory, MemoryFatalError } from "@/memory/base.js";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import * as R from "remeda";
import { shallowCopy } from "@/serializer/utils.js";
import { removeFromArray } from "@/internals/helpers/array.js";

export interface Handlers {
  removalSelector: (messages: BaseMessage[]) => BaseMessage;
}

export interface TokenMemoryInput {
  llm: ChatLLM<ChatLLMOutput>;
  maxTokens?: number;
  capacityThreshold?: number;
  handlers?: Handlers;
}

export class TokenMemory extends BaseMemory {
  public readonly messages: BaseMessage[] = [];

  protected llm: ChatLLM<ChatLLMOutput>;
  protected threshold = 1;
  protected maxTokens: number | null = null;
  protected tokensUsed = 0;
  protected tokensByMessage = new WeakMap<BaseMessage, number>();
  public readonly handlers: Handlers;

  constructor(config: TokenMemoryInput) {
    super();
    this.llm = config.llm;
    this.maxTokens = config.maxTokens ?? null;
    this.threshold = config.capacityThreshold ?? 0.75;
    this.handlers = {
      ...config?.handlers,
      removalSelector: config.handlers?.removalSelector || ((messages) => messages[0]),
    };
    if (!R.clamp({ min: 0, max: 1 })(this.threshold)) {
      throw new TypeError('"capacityThreshold" must be a number in range (0, 1>');
    }
  }

  static {
    this.register();
  }

  async add(message: BaseMessage) {
    if (this.maxTokens === null) {
      const meta = await this.llm.meta();
      this.maxTokens = Math.ceil((meta.tokenLimit ?? Infinity) * this.threshold);
    }

    const meta = await this.llm.tokenize([message]);
    if (meta.tokensCount > this.maxTokens) {
      throw new MemoryFatalError(
        `Retrieved message (${meta.tokensCount} tokens) cannot fit inside current memory (${this.maxTokens} tokens)`,
      );
    }

    while (this.tokensUsed > this.maxTokens - meta.tokensCount) {
      const messageToDelete = this.handlers.removalSelector(this.messages);
      const exists = removeFromArray(this.messages, messageToDelete);

      if (!messageToDelete || !exists) {
        throw new MemoryFatalError('The "removalSelector" handler must return a valid message!');
      }

      const tokensCount = this.tokensByMessage.get(messageToDelete) ?? 0;
      this.tokensUsed -= tokensCount;
    }

    this.tokensUsed += meta.tokensCount;
    this.tokensByMessage.set(message, meta.tokensCount);
    this.messages.push(message);
  }

  reset() {
    for (const msg of this.messages) {
      this.tokensByMessage.delete(msg);
    }
    this.messages.length = 0;
    this.tokensUsed = 0;
  }

  stats() {
    return {
      tokensUsed: this.tokensUsed,
      maxTokens: this.maxTokens,
      messagesCount: this.messages.length,
    };
  }

  createSnapshot() {
    return {
      tokensUsed: this.tokensUsed,
      llm: this.llm,
      maxTokens: this.maxTokens,
      threshold: this.threshold,
      messages: shallowCopy(this.messages),
      handlers: this.handlers,
      tokensByMessage: this.messages
        .map((message) => [message, this.tokensByMessage.get(message)])
        .filter(([_, value]) => value !== undefined) as [BaseMessage, number][],
    };
  }

  loadSnapshot({ tokensByMessage, ...state }: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, state, {
      tokensByMessage: new WeakMap(tokensByMessage),
    });
  }
}
