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
  StreamGenerateOptions,
} from "@/llms/base.js";
import { shallowCopy } from "@/serializer/utils.js";
import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import { BaseMessage, RoleType } from "@/llms/primitives/message.js";
import { Emitter } from "@/emitter/emitter.js";
import { ClientOptions, OpenAI as Client } from "openai";
import { GetRunContext } from "@/context.js";
import { promptTokensEstimate } from "openai-chat-tokens";
import { Serializer } from "@/serializer/serializer.js";
import { getProp, getPropStrict } from "@/internals/helpers/object.js";
import { isString } from "remeda";

type Parameters = Omit<Client.Chat.ChatCompletionCreateParams, "stream" | "messages" | "model">;
type Response = Omit<Client.Chat.ChatCompletionChunk, "object">;

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
  modelId?: Client.ChatModel;
  client?: Client;
  parameters?: Partial<Parameters>;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<OpenAIChatLLMOutput>;
}

export class OpenAIChatLLM extends ChatLLM<OpenAIChatLLMOutput> {
  public readonly emitter = Emitter.root.child<GenerateCallbacks>({
    namespace: ["openai", "chat_llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<Parameters>;

  constructor({
    client,
    modelId = "gpt-4o",
    parameters,
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

  async tokenize(input: BaseMessage[]): Promise<BaseLLMTokenizeOutput> {
    const tokensCount = promptTokensEstimate({
      messages: input.map(
        (msg) =>
          ({
            role: msg.role,
            content: msg.text,
          }) as Client.Chat.ChatCompletionMessageParam,
      ),
    });

    return {
      tokensCount,
    };
  }

  protected _prepareRequest(
    input: BaseMessage[],
    options?: GenerateOptions,
  ): Client.Chat.ChatCompletionCreateParams {
    return {
      ...this.parameters,
      model: this.modelId,
      stream: false,
      messages: input.map(
        (message) =>
          ({
            role: message.role,
            content: message.text,
            response_metadata: message.meta,
          }) as Client.Chat.ChatCompletionMessageParam,
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
    options: GenerateOptions | undefined,
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
          }) as Client.Chat.ChatCompletionChunk.Choice,
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
