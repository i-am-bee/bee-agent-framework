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
import { createWatsonXClient, WatsonXClient } from "@/adapters/watsonx/backend/client.js";
import { findLast, isEmpty, isTruthy } from "remeda";
import WatsonxAiMlVml_v1, {
  TextChatParameterTools,
  TextChatParams,
  TextChatResultChoice,
  TextChatUsage,
} from "@ibm-cloud/watsonx-ai/dist/watsonx-ai-ml/vml_v1.js";
import { shallowCopy } from "@/serializer/utils.js";
import { Emitter } from "@/emitter/emitter.js";
import { RunContext } from "@/context.js";
import { AssistantMessage, Message } from "@/backend/message.js";
import { ToolCallPart } from "ai";
import Type = WatsonxAiMlVml_v1.TextChatResponseFormat.Constants.Type;

export type WatsonXChatParams = Omit<
  TextChatParams,
  "modelId" | "spaceId" | "projectId" | "messages"
>;

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
    public readonly modelId: string,
    public readonly parameters: WatsonXChatParams = {},
    client?: WatsonXClient,
  ) {
    super();
    this.client = client ?? createWatsonXClient();
  }

  protected async _create(input: ChatModelInput, run: RunContext<this>) {
    // TODO: support abortion (https://github.com/IBM/watsonx-ai-node-sdk/issues/3)
    const { result } = await this.client.instance.textChat(await this.prepareParameters(input));
    const { messages, finishReason, usage } = this.extractResult(result.choices, result.usage);
    return new ChatModelOutput(messages, usage, finishReason);
  }

  async *_createStream(input: ChatModelInput, run: RunContext<this>) {
    const chunks: ChatModelOutput[] = [];
    const stream = await this.client.instance.textChatStream({
      ...(await this.prepareParameters(input)),
      returnObject: true,
    });
    for await (const raw of stream) {
      if (run.signal.aborted) {
        stream.controller.abort(run.signal.aborted);
        break;
      }
      const { messages, finishReason, usage } = this.extractResult(
        raw.data.choices.map(({ delta, ...choice }) => ({ ...choice, message: delta })),
        raw.data.usage,
      );
      const chunk = new ChatModelOutput(messages, usage, finishReason);
      yield chunk;
      chunks.push(chunk);
    }

    return ChatModelOutput.fromChunks(chunks);
  }

  protected extractResult(choices: TextChatResultChoice[], usage?: TextChatUsage) {
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
                  args: call.function.arguments,
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

  protected async prepareParameters(input: ChatModelInput): Promise<TextChatParams> {
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
      messages: input.messages!, // todo: verify
      spaceId: this.client.options.spaceId,
      projectId: this.client.options.projectId,
      tools: isEmpty(tools) ? undefined : tools,
      maxTokens: input.maxTokens,
      headers: input.headers,
      topP: input.topP,
      frequencyPenalty: input.frequencyPenalty,
      temperature: input.temperature,
      n: input.topK,
      presencePenalty: input.presencePenalty,
      ...(input.responseFormat?.type === "object-json" && {
        responseFormat: { type: Type.JSON_OBJECT },
      }),
    };
  }

  createSnapshot() {
    return {
      modelId: this.modelId,
      parameters: shallowCopy(this.parameters),
      client: this.client,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
