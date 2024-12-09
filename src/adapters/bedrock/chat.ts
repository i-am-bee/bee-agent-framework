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
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { Emitter } from "@/emitter/emitter.js";
import type { AwsCredentialIdentity, Provider } from "@aws-sdk/types";
import {
  BedrockRuntimeClient as Client,
  ConverseCommand,
  ConverseCommandOutput,
  ConverseStreamCommand,
  ContentBlockDeltaEvent,
  InferenceConfiguration,
  Message as BedrockMessage,
  SystemContentBlock as BedrockSystemContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { GetRunContext } from "@/context.js";
import { Serializer } from "@/serializer/serializer.js";
import { NotImplementedError } from "@/errors.js";

type Response = ContentBlockDeltaEvent | ConverseCommandOutput;

export class ChatBedrockOutput extends ChatLLMOutput {
  public readonly responses: Response[];

  constructor(response: Response) {
    super();
    this.responses = [response];
  }

  static {
    this.register();
  }

  get messages() {
    return this.responses.flatMap((response) => {
      if ("delta" in response && response.delta?.text) {
        return [
          BaseMessage.of({
            role: Role.ASSISTANT,
            text: response.delta.text,
          }),
        ];
      } else if ("output" in response && response.output?.message?.content) {
        return response.output.message.content
          .filter((choice) => choice?.text)
          .map((choice) =>
            BaseMessage.of({
              role: Role.ASSISTANT,
              text: choice.text!,
            }),
          );
      }
      return [];
    });
  }

  getTextContent() {
    return this.messages.map((msg) => msg.text).join("");
  }

  merge(other: ChatBedrockOutput) {
    this.responses.push(...other.responses);
  }

  toString() {
    return this.getTextContent();
  }

  createSnapshot() {
    return {
      responses: shallowCopy(this.responses),
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

interface Input {
  modelId?: string;
  region?: string;
  client?: Client;
  credentials?: AwsCredentialIdentity | Provider<AwsCredentialIdentity>;
  parameters?: InferenceConfiguration;
  executionOptions?: ExecutionOptions;
  cache?: LLMCache<ChatBedrockOutput>;
}

export type BedrockChatLLMEvents = ChatLLMGenerateEvents<ChatBedrockOutput>;

export class BedrockChatLLM extends ChatLLM<ChatBedrockOutput> {
  public readonly emitter = Emitter.root.child<BedrockChatLLMEvents>({
    namespace: ["bedrock", "chat_llm"],
    creator: this,
  });

  public readonly client: Client;
  public readonly parameters: Partial<InferenceConfiguration>;

  constructor({
    client,
    modelId = "amazon.titan-text-lite-v1",
    region = "us-east-1",
    credentials,
    parameters = {
      temperature: 0,
    },
    executionOptions = {},
    cache,
  }: Input = {}) {
    super(modelId, executionOptions, cache);
    this.client = client ?? new Client({ region: region, credentials: credentials });
    this.parameters = parameters ?? {};
  }

  static {
    this.register();
    Serializer.register(Client, {
      toPlain: (value) => ({
        config: {
          region: value.config.region,
          credentials: value.config.credentials,
        },
      }),
      fromPlain: (value) =>
        new Client({
          region: value.config.region,
          credentials: value.config.credentials,
        }),
    });
  }

  async meta(): Promise<LLMMeta> {
    if (this.modelId.includes("titan-text-premier")) {
      return { tokenLimit: 3 * 1024 };
    } else if (
      this.modelId.includes("titan-text-express") ||
      this.modelId.includes("anthropic.claude-v2") ||
      this.modelId.includes("anthropic.claude-instant-v1") ||
      this.modelId.includes("anthropic.claude-3-sonnet") ||
      this.modelId.includes("anthropic.claude-3-haiku") ||
      this.modelId.includes("anthropic.claude-3-opus") ||
      this.modelId.includes("meta.llama2") ||
      this.modelId.includes("cohere.command-text") ||
      this.modelId.includes("cohere.command-light")
    ) {
      return { tokenLimit: 4 * 1024 };
    } else if (
      this.modelId.includes("titan-text-lite") ||
      this.modelId.includes("anthropic.claude-3-5-sonnet") ||
      this.modelId.includes("anthropic.claude-3-5-haiku") ||
      this.modelId.includes("meta.llama3-8b") ||
      this.modelId.includes("meta.llama3-70b") ||
      this.modelId.includes("ai21.j2")
    ) {
      return { tokenLimit: 8 * 1024 };
    } else if (
      this.modelId.includes("mistral.mistral-7b") ||
      this.modelId.includes("mistral.mixtral-8x7b") ||
      this.modelId.includes("mistral.mistral-small")
    ) {
      return { tokenLimit: 32 * 1024 };
    } else if (
      this.modelId.includes("meta.llama3-1") ||
      this.modelId.includes("meta.llama3-2") ||
      this.modelId.includes("mistral.mistral-large") ||
      this.modelId.includes("cohere.command-r")
    ) {
      return { tokenLimit: 128 * 1024 };
    } else if (this.modelId.includes("ai21.jamba")) {
      return { tokenLimit: 256 * 1024 };
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
    const contentLength = input.reduce((acc, msg) => acc + msg.text.length, 0);
    return { tokensCount: Math.ceil(contentLength / 4) };
  }

  protected async _generate(
    input: BaseMessage[],
    _options: Partial<GenerateOptions>,
    run: GetRunContext<typeof this>,
  ): Promise<ChatBedrockOutput> {
    const { conversation, systemMessage } = this.convertToConverseMessages(input);
    const command = new ConverseCommand({
      modelId: this.modelId,
      messages: conversation,
      system: systemMessage,
      ...this.parameters,
    });
    const response = await this.client.send(command, { abortSignal: run.signal });
    return new ChatBedrockOutput(response);
  }

  protected async *_stream(
    input: BaseMessage[],
    _options: StreamGenerateOptions | undefined,
    run: GetRunContext<typeof this>,
  ): AsyncStream<ChatBedrockOutput> {
    const { conversation, systemMessage } = this.convertToConverseMessages(input);
    const command = new ConverseStreamCommand({
      modelId: this.modelId,
      messages: conversation,
      system: systemMessage,
      ...this.parameters,
    });
    const response = await this.client.send(command, { abortSignal: run.signal });
    for await (const chunk of response?.stream || []) {
      if (chunk.contentBlockDelta) {
        yield new ChatBedrockOutput(chunk.contentBlockDelta);
      }
    }
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      client: this.client,
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
    };
  }

  protected convertToConverseMessages(messages: BaseMessage[]): {
    conversation: BedrockMessage[];
    systemMessage: BedrockSystemContentBlock[];
  } {
    const systemMessage: BedrockSystemContentBlock[] = messages
      .filter((msg) => msg.role === Role.SYSTEM)
      .map((msg) => ({ text: msg.text }));

    const converseMessages: BedrockMessage[] = messages
      .filter((msg) => msg.role !== Role.SYSTEM)
      .map((msg) => ({
        role: msg.role === Role.USER ? Role.USER : Role.ASSISTANT,
        content: [{ text: msg.text }],
      }));

    const conversation = converseMessages.reduce<BedrockMessage[]>(
      (messageList, currentMessage) => {
        const lastMessage = messageList[messageList.length - 1];
        if (lastMessage && lastMessage !== currentMessage && lastMessage.role === Role.USER) {
          lastMessage.content = lastMessage.content!.concat(currentMessage.content!);
        } else {
          messageList.push(currentMessage);
        }

        return messageList;
      },
      [],
    );
    return { conversation, systemMessage };
  }
}
