/**
 * Copyright 2025 IBM Corp.
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

import { ChatModel, ChatModelEmitter, ChatModelInput, ChatModelOutput } from "@/backend/chat.js";
import { WatsonXClient, WatsonXClientSettings } from "@/adapters/watsonx/backend/client.js";
import { findLast, isEmpty, isTruthy } from "remeda";
import WatsonxAiMlVml_v1, {
  TextChatMessages,
  TextChatParameterTools,
  TextChatParams,
  TextChatResultChoice,
  TextChatUsage,
} from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Emitter } from "@/emitter/emitter.js";
import { GetRunContext } from "@/context.js";
import { AssistantMessage, Message, SystemMessage, ToolMessage } from "@/backend/message.js";
import { ToolCallPart } from "ai";
import Type = WatsonxAiMlVml_v1.TextChatResponseFormat.Constants.Type;
import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { getEnv } from "@/internals/env.js";

export class WatsonXChatModel extends ChatModel {
  protected readonly client: WatsonXClient;
  public readonly emitter: ChatModelEmitter = Emitter.root.child({
    namespace: ["backend", "watsonx", "chat"],
    creator: this,
  });

  get providerId() {
    return "watsonx";
  }

  constructor(
    public readonly modelId = getEnv("WATSONX_API_CHAT_MODEL", "ibm/granite-3-8b-instruct"),
    client?: WatsonXClient | WatsonXClientSettings,
  ) {
    super();
    this.client = WatsonXClient.ensure(client);
  }

  protected async _create(input: ChatModelInput) {
    // TODO: support abortion (https://github.com/IBM/watsonx-ai-node-sdk/issues/3)
    const { result } = await this.client.instance.textChat(await this.prepareInput(input));
    const { messages, finishReason, usage } = this.extractOutput(result.choices, result.usage);
    return new ChatModelOutput(messages, usage, finishReason);
  }

  async *_createStream(input: ChatModelInput, run: GetRunContext<this>) {
    const stream = await this.client.instance.textChatStream({
      ...(await this.prepareInput(input)),
      returnObject: true,
    });
    for await (const raw of stream) {
      if (run.signal.aborted) {
        stream.controller.abort(run.signal.aborted);
        break;
      }
      const { messages, finishReason, usage } = this.extractOutput(
        raw.data.choices.map(({ delta, ...choice }) => ({ ...choice, message: delta })),
        raw.data.usage,
      );
      yield new ChatModelOutput(messages, usage, finishReason);
    }
  }

  protected extractOutput(choices: TextChatResultChoice[], usage?: TextChatUsage) {
    return {
      finishReason: findLast(choices, (choice) => Boolean(choice?.finish_reason))
        ?.finish_reason as ChatModelOutput["finishReason"],
      usage: usage
        ? {
            completionTokens: usage.completion_tokens ?? 0,
            promptTokens: usage.prompt_tokens ?? 0,
            totalTokens: usage.total_tokens ?? 0,
          }
        : undefined,
      messages: choices
        .flatMap(({ message }) => {
          const messages: Message[] = [];
          if (message?.content) {
            const msg = new AssistantMessage({ type: "text", text: message.content });
            // msg.role = message.role || msg.role;
            messages.push(msg);
          }
          if (message?.tool_calls) {
            const msg = new AssistantMessage(
              message.tool_calls.map(
                (call): ToolCallPart => ({
                  type: "tool-call",
                  toolCallId: call.id,
                  toolName: call.function.name,
                  args: parseBrokenJson(call.function.arguments),
                }),
              ),
            );
            // msg.role = message.role || msg.role;
            messages.push(msg);
          }
          if (message?.refusal) {
            const msg = new AssistantMessage({ type: "text", text: message.refusal });
            // msg.role = message.role || msg.role;
            messages.push(msg);
          }
          return messages;
        })
        .filter(isTruthy),
    };
  }

  protected async prepareInput(input: ChatModelInput): Promise<TextChatParams> {
    const tools: TextChatParameterTools[] = await Promise.all(
      (input.tools ?? []).map(async (tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: await tool.getInputJsonSchema(),
        },
      })),
    );

    return {
      ...this.parameters,
      modelId: this.modelId,
      messages: input.messages.flatMap((message): TextChatMessages[] => {
        if (message instanceof ToolMessage) {
          return message.content.map((content) => ({
            role: "tool",
            content: JSON.stringify(content.result),
            tool_call_id: content.toolCallId,
          }));
        } else if (message instanceof SystemMessage) {
          return message.content.map((content) => ({
            role: "system",
            content: content.text,
          }));
        } else if (message instanceof AssistantMessage) {
          return message.content.map((content) => ({
            role: "assistant",
            ...(content.type === "text" && {
              content: content.text,
            }),
            ...(content.type === "tool-call" && {
              id: content.toolCallId,
              type: "function",
              function: {
                name: content.toolName,
                arguments: JSON.stringify(content.args),
              },
            }),
          }));
        } else {
          return [message.toPlain()];
        }
      }),
      spaceId: this.client.spaceId,
      projectId: this.client.projectId,
      tools: isEmpty(tools) ? undefined : tools,
      maxTokens: input.maxTokens ?? this.parameters.maxTokens,
      topP: input.topP ?? this.parameters.topP,
      frequencyPenalty: input.frequencyPenalty ?? this.parameters.frequencyPenalty,
      temperature: input.temperature ?? this.parameters.temperature,
      n: input.topK ?? this.parameters.topK,
      presencePenalty: input.presencePenalty ?? this.parameters.presencePenalty,
      ...(input.responseFormat?.type === "object-json" && {
        responseFormat: { type: Type.JSON_OBJECT },
      }),
    };
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      client: this.client,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
