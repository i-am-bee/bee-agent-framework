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
import { ChatLLM, ChatLLMGenerateEvents, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, RoleType } from "@/llms/primitives/message.js";
import { Emitter } from "@/emitter/emitter.js";
import { ClientOptions, Groq as Client } from "groq-sdk";
import { GetRunContext } from "@/context.js";
import { Serializer } from "@/serializer/serializer.js";
import { getPropStrict } from "@/internals/helpers/object.js";
import { ChatCompletionCreateParams } from "groq-sdk/resources/chat/completions";

type Parameters = Omit<ChatCompletionCreateParams, "stream" | "messages" | "model">;
type Response = Omit<Client.Chat.ChatCompletionChunk, "object">;

export class ChatGroqOutput extends ChatLLMOutput {
  public readonly responses: Response[];

  constructor(response: Response) {
    super();
    this.responses = [response];
  }

  static {
    this.register();
  }

  get messages() {
    return this.responses
      .flatMap((response) => response.choices)
      .flatMap((choice) =>
        BaseMessage.of({
          role: choice.delta.role as RoleType,
          text: choice.delta.content!,
        }),
      );
  }

  getTextContent(): string {
    return this.messages.map((msg) => msg.text).join("\n");
  }

  merge(other: ChatGroqOutput): void {
    this.responses.push(...other.responses);
  }

  toString(): string {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      responses: shallowCopy(this.responses),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}

interface Input {
  modelId?: string;
  client?: Client;
  parameters?: Parameters;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<ChatGroqOutput>;
}

export type GroqChatLLMEvents = ChatLLMGenerateEvents<ChatGroqOutput>;

export class GroqChatLLM extends ChatLLM<ChatGroqOutput> {
  public readonly emitter = Emitter.root.child<GroqChatLLMEvents>({
    namespace: ["groq", "chat_llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<Parameters>;

  constructor({
    client,
    modelId = "llama-3.1-70b-versatile",
    parameters = {
      temperature: 0,
    },
    executionOptions = {},
    cache,
  }: Input = {}) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client();
    this.parameters = parameters ?? {};
  }

  static {
    this.register();
    Serializer.register(Client, {
      toPlain: (value) => ({
        options: getPropStrict(value, "_options") as ClientOptions,
      }),
      fromPlain: (value) => new Client(value.options),
    });
  }

  async meta(): Promise<LLMMeta> {
    if (
      this.modelId.includes("gemma") ||
      this.modelId.includes("llama3") ||
      this.modelId.includes("llama-guard")
    ) {
      return { tokenLimit: 8 * 1024 };
    } else if (this.modelId.includes("llava-v1.5")) {
      return { tokenLimit: 4 * 1024 };
    } else if (this.modelId.includes("llama-3.1-70b") || this.modelId.includes("llama-3.1-8b")) {
      return { tokenLimit: 128 * 1024 };
    } else if (this.modelId.includes("mixtral-8x7b")) {
      return { tokenLimit: 32 * 1024 };
    }

    return {
      tokenLimit: Infinity,
    };
  }

  async embed(input: BaseMessage[][], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
    const { data } = await this.client.embeddings.create(
      {
        model: this.modelId,
        input: input.flatMap((msgs) => msgs.map((msg) => msg.text)) as string[],
        encoding_format: "float",
      },
      {
        signal: options?.signal,
        stream: false,
      },
    );
    return { embeddings: data.map(({ embedding }) => embedding as number[]) };
  }

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const contentLength = input.reduce((acc, msg) => acc + msg.text.length, 0);

    return {
      tokensCount: Math.ceil(contentLength / 4),
    };
  }

  protected _prepareRequest(
    input: BaseMessage[],
    options: GenerateOptions,
  ): ChatCompletionCreateParams {
    return {
      ...this.parameters,
      model: this.modelId,
      stream: false,
      messages: input.map(
        (message) =>
          ({
            role: message.role,
            content: message.text,
          }) as Client.Chat.ChatCompletionMessageParam,
      ),
      ...(options?.guided?.json && {
        response_format: {
          type: "json_object",
        },
      }),
    };
  }

  protected async _generate(
    input: BaseMessage[],
    options: GenerateOptions,
    run: GetRunContext<typeof this>,
  ): Promise<ChatGroqOutput> {
    const response = await this.client.chat.completions.create(
      {
        ...this._prepareRequest(input, options),
        stream: false,
      },
      {
        signal: run.signal,
      },
    );
    return new ChatGroqOutput({
      id: response.id,
      model: response.model,
      created: response.created,
      system_fingerprint: response.system_fingerprint,
      choices: response.choices.map(
        (choice) =>
          ({
            delta: choice.message,
            index: choice.index,
            logprobs: choice.logprobs,
            finish_reason: choice.finish_reason,
          }) as Client.Chat.ChatCompletionChunk.Choice,
      ),
    });
  }

  protected async *_stream(
    input: BaseMessage[],
    options: Partial<StreamGenerateOptions>,
    run: GetRunContext<typeof this>,
  ): AsyncStream<ChatGroqOutput> {
    for await (const chunk of await this.client.chat.completions.create(
      {
        ...this._prepareRequest(input, options),
        stream: true,
      },
      {
        signal: run.signal,
      },
    )) {
      yield new ChatGroqOutput(chunk);
    }
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      parameters: shallowCopy(this.parameters),
      client: this.client,
    };
  }
}
