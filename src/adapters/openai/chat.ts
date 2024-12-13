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
import { ClientOptions, OpenAI, AzureOpenAI } from "openai";
import { GetRunContext } from "@/context.js";
import { promptTokensEstimate } from "openai-chat-tokens";
import { Serializer } from "@/serializer/serializer.js";
import { getProp, getPropStrict } from "@/internals/helpers/object.js";
import { isString } from "remeda";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatModel,
  EmbeddingCreateParams,
} from "openai/resources/index";

type Parameters = Omit<ChatCompletionCreateParams, "stream" | "messages" | "model">;
type Response = Omit<ChatCompletionChunk, "object">;

export class OpenAIChatLLMOutput extends ChatLLMOutput {
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

  merge(other: OpenAIChatLLMOutput): void {
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
  modelId?: ChatModel;
  client?: OpenAI | AzureOpenAI;
  parameters?: Partial<Parameters>;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<OpenAIChatLLMOutput>;
  azure?: boolean;
}

export type OpenAIChatLLMEvents = ChatLLMGenerateEvents<OpenAIChatLLMOutput>;
export interface OpenAIEmbeddingOptions
  extends EmbeddingOptions,
    Omit<EmbeddingCreateParams, "input" | "model"> {}

export class OpenAIChatLLM extends ChatLLM<OpenAIChatLLMOutput> {
  public readonly emitter = Emitter.root.child<OpenAIChatLLMEvents>({
    namespace: ["openai", "chat_llm"],
    creator: this,
  });

  public readonly client: OpenAI | AzureOpenAI;
  public readonly parameters: Partial<Parameters>;

  constructor({ client, modelId, parameters, executionOptions = {}, cache, azure }: Input = {}) {
    super(modelId || "gpt-4o-mini", executionOptions, cache);
    if (client) {
      this.client = client;
    } else if (azure) {
      this.client = new AzureOpenAI();
    } else {
      this.client = new OpenAI();
    }
    this.parameters = parameters ?? { temperature: 0 };
  }

  static {
    this.register();
    Serializer.register(AzureOpenAI, {
      toPlain: (value) => ({
        azureADTokenProvider: getPropStrict(value, "_azureADTokenProvider"),
        apiVersion: getPropStrict(value, "apiVersion"),
        deployment: getPropStrict(value, "_deployment"),
      }),
      fromPlain: (value) => new AzureOpenAI(value.azureADTokenProvider),
    });
    Serializer.register(OpenAI, {
      toPlain: (value) => ({
        options: getPropStrict(value, "_options") as ClientOptions,
      }),
      fromPlain: (value) => new OpenAI(value.options),
    });
  }

  async meta(): Promise<LLMMeta> {
    if (
      this.modelId.includes("gpt-4o") ||
      this.modelId.includes("gpt-4-turbo") ||
      this.modelId.includes("gpt-4-0125-preview") ||
      this.modelId.includes("gpt-4-1106-preview")
    ) {
      return { tokenLimit: 128 * 1024 };
    } else if (this.modelId.includes("gpt-4")) {
      return { tokenLimit: 8 * 1024 };
    } else if (this.modelId.includes("gpt-3.5-turbo")) {
      return { tokenLimit: 16 * 1024 };
    } else if (this.modelId.includes("gpt-3.5")) {
      return { tokenLimit: 8 * 1024 };
    }

    return {
      tokenLimit: Infinity,
    };
  }

  async embed(
    input: BaseMessage[][],
    options: OpenAIEmbeddingOptions = {},
  ): Promise<EmbeddingOutput> {
    const response = await this.client.embeddings.create(
      {
        ...options,
        model: this.modelId,
        input: input.flatMap((messages) => messages).flatMap((msg) => msg.text),
      },
      { signal: options?.signal },
    );
    const embeddings = response.data.map((data) => data.embedding);
    return { embeddings };
  }

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const tokensCount = promptTokensEstimate({
      messages: input.map(
        (msg) =>
          ({
            role: msg.role,
            content: msg.text,
          }) as ChatCompletionMessageParam,
      ),
    });

    return {
      tokensCount,
    };
  }

  protected _prepareRequest(
    input: BaseMessage[],
    options?: GenerateOptions,
  ): ChatCompletionCreateParams {
    type OpenAIMessage =
      | ChatCompletionSystemMessageParam
      | ChatCompletionUserMessageParam
      | ChatCompletionAssistantMessageParam;

    return {
      ...this.parameters,
      model: this.modelId,
      stream: false,
      messages: input.map(
        (message): OpenAIMessage => ({
          role: message.role as OpenAIMessage["role"],
          content: message.text,
        }),
      ),

      response_format: (() => {
        if (options?.guided?.json) {
          const schema = isString(options.guided.json)
            ? JSON.parse(options.guided.json)
            : options.guided.json;

          // OpenAI requires that 'properties' must be defined when type equals 'object'
          if (getProp(schema, ["type"]) === "object" && !getProp(schema, ["properties"])) {
            schema.properties = {};
          }

          return {
            type: "json_schema",
            json_schema: {
              name: "schema",
              schema,
            },
          };
        }
      })(),
    };
  }

  protected async _generate(
    input: BaseMessage[],
    options: Partial<GenerateOptions>,
    run: GetRunContext<typeof this>,
  ): Promise<OpenAIChatLLMOutput> {
    const response = await this.client.chat.completions.create(
      {
        ...this._prepareRequest(input, options),
        stream: false,
      },
      {
        signal: run.signal,
      },
    );

    return new OpenAIChatLLMOutput({
      id: response.id,
      model: response.model,
      created: response.created,
      usage: response.usage,
      service_tier: response.service_tier,
      system_fingerprint: response.system_fingerprint,
      choices: response.choices.map(
        (choice) =>
          ({
            delta: choice.message,
            index: 1,
            logprobs: choice.logprobs,
            finish_reason: choice.finish_reason,
          }) as ChatCompletionChunk.Choice,
      ),
    });
  }

  protected async *_stream(
    input: BaseMessage[],
    options: StreamGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): AsyncStream<OpenAIChatLLMOutput> {
    for await (const chunk of await this.client.chat.completions.create(
      {
        ...this._prepareRequest(input, options),
        stream: true,
      },
      {
        signal: run.signal,
      },
    )) {
      yield new OpenAIChatLLMOutput(chunk);
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
