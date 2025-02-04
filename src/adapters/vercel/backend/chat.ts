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

import {
  ChatModelInput,
  ChatModel,
  ChatModelOutput,
  ChatModelEvents,
  ChatModelObjectInput,
  ChatModelObjectOutput,
} from "@/backend/chat.js";
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreToolMessage,
  generateObject,
  generateText,
  jsonSchema,
  LanguageModelV1,
  streamText,
} from "ai";
import { Emitter } from "@/emitter/emitter.js";
import { AssistantMessage, Message, ToolMessage } from "@/backend/message.js";
import { RunContext } from "@/context.js";
import { ValueError } from "@/errors.js";
import { Serializer } from "@/serializer/serializer.js";
import { ClassConstructor } from "@/internals/types.js";
import { mapToObj, toCamelCase } from "remeda";

export class VercelChatModel<R extends LanguageModelV1 = LanguageModelV1> extends ChatModel {
  public readonly emitter: Emitter<ChatModelEvents>;

  constructor(protected readonly model: R) {
    super();
    this.emitter = Emitter.root.child({
      namespace: ["backend", this.providerId, "chat"],
    });
    if (!this.modelId) {
      throw new ValueError("No modelId has been provided!");
    }

    const target = this.model.constructor as ClassConstructor<R>;
    Serializer.register(target, {
      toPlain: (value) => Object.entries(value),
      fromPlain: (value: any) => {
        const instance = new target();
        Object.assign(instance, Object.fromEntries(value));
        return instance;
      },
    });
  }

  static {
    this.register();
  }

  get modelId(): string {
    return this.model.modelId;
  }

  get providerId(): string {
    const provider = this.model.provider.split(".")[0].split("-")[0];
    return toCamelCase(provider);
  }

  protected async _create(input: ChatModelInput) {
    const {
      finishReason,
      usage,
      response: { messages },
    } = await generateText(await this.transformInput(input));

    return new ChatModelOutput(this.transformMessages(messages), usage, finishReason);
  }

  protected async _createStructure<T>(
    { schema, ...input }: ChatModelObjectInput<T>,
    run: RunContext<this>,
  ): Promise<ChatModelObjectOutput<T>> {
    const response = await generateObject({
      ...(await this.transformInput(input)),
      schema,
      abortSignal: run.signal,
      model: this.model,
      output: "object",
      mode: "auto",
    });

    return { object: response.object };
  }

  async *_createStream(input: ChatModelInput, run: RunContext<this>) {
    const { fullStream, usage, finishReason } = streamText({
      ...(await this.transformInput(input)),
      abortSignal: run.signal,
    });

    const chunks: ChatModelOutput[] = [];
    for await (const event of fullStream) {
      let message: Message;
      switch (event.type) {
        case "text-delta":
          message = new AssistantMessage(event.textDelta);
          break;
        case "tool-call":
          message = new AssistantMessage({
            type: event.type,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            args: event.args,
          });
          break;
        case "error":
          throw new Error("Unhandled error", { cause: event.error });
        case "step-finish":
        case "step-start":
          continue;
        case "tool-result":
          message = new ToolMessage({
            type: event.type,
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            result: event.result,
          });
          break;
        case "tool-call-streaming-start":
        case "tool-call-delta":
          continue;
        case "finish":
          continue;
        default:
          throw new Error(`Unhandled event "${event.type}"`);
      }
      const chunk = new ChatModelOutput([message]);
      chunks.push(chunk);
      yield chunk;
    }

    const final = ChatModelOutput.fromChunks(chunks);
    final.usage = await usage;
    final.finishReason = await finishReason;
    return final;
  }

  protected async transformInput(
    input: ChatModelInput,
  ): Promise<Parameters<typeof generateText<Record<string, any>>>[0]> {
    const tools = await Promise.all(
      (input.tools ?? []).map(async (tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: jsonSchema(await tool.getInputJsonSchema()),
      })),
    );

    return {
      ...input,
      model: this.model,
      tools: mapToObj(tools, ({ name, ...tool }) => [name, tool]),
      messages: input.messages.map((msg): CoreMessage => {
        if (msg instanceof AssistantMessage) {
          return { role: "assistant", content: msg.content };
        } else if (msg instanceof ToolMessage) {
          return { role: "tool", content: msg.content };
        }
        return { role: msg.role as "user" | "system", content: msg.getTextContent() };
      }),
    };
  }

  protected transformMessages(messages: (CoreAssistantMessage | CoreToolMessage)[]): Message[] {
    return messages.flatMap((msg) => {
      if (msg.role === "tool") {
        return new ToolMessage(msg.content, msg.experimental_providerMetadata);
      }
      return new AssistantMessage(msg.content, msg.experimental_providerMetadata);
    });
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      model: this.model,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  static fromModel<T2 extends LanguageModelV1, T extends VercelChatModel<T2>>(
    this: new (...args: any[]) => T,
    model: T2,
  ): T {
    if (this.prototype === VercelChatModel) {
      return new VercelChatModel(model) as T;
    } else {
      return Reflect.construct(VercelChatModel, [model], this) as T;
    }
  }
}
