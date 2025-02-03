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

import { Serializable } from "@/internals/serializable.js";
import { shallowCopy } from "@/serializer/utils.js";
import { FilePart, ImagePart, TextPart, ToolCallPart, ToolResultPart } from "ai";
import { z } from "zod";
import { ValueError } from "@/errors.js";

export type MessageRole = "user" | "system" | "tool" | "assistant";
export type MessageContentPart = TextPart | ToolCallPart | ImagePart | FilePart | ToolResultPart;

export interface MessageMeta {
  [key: string]: any;
  createdAt?: Date;
}

export interface MessageInput {
  role: MessageRole;
  text: string; // TODO
  meta?: MessageMeta;
}

export abstract class Message<
  T extends MessageContentPart = MessageContentPart,
  R extends string = MessageRole | string,
> extends Serializable {
  public abstract readonly role: R;
  public readonly content: T[];

  constructor(
    content: T | T[] | string,
    public readonly meta: MessageMeta = {},
  ) {
    super();
    if (!meta?.createdAt) {
      meta.createdAt = new Date();
    }
    if (typeof content === "string") {
      this.content = [this.fromString(content)];
    } else {
      this.content = Array.isArray(content) ? content : [content];
    }
  }

  protected abstract fromString(input: string): T;

  static of({ role, text, meta }: MessageInput) {
    if (role === "user") {
      return new UserMessage(text, meta);
    } else if (role === "assistant") {
      return new AssistantMessage(text, meta);
    } else if (role === "system") {
      return new SystemMessage(text, meta);
    } else {
      return new CustomMessage(role, text, meta);
    }
  }

  /* @deprecated */
  get text() {
    return this.getTextContent();
  }

  getTextContent() {
    return this.content.map((content) => (content.type === "text" ? content.text : "")).join("");
  }

  createSnapshot() {
    return { role: this.role, content: shallowCopy(this.content), meta: shallowCopy(this.meta) };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }

  toPlain() {
    return { role: this.role, content: shallowCopy(this.content) } as const;
  }
}

export class AssistantMessage extends Message<TextPart | ToolCallPart> {
  public readonly role = "assistant";

  static {
    this.register();
  }

  protected fromString(text: string): TextPart {
    return { type: "text", text };
  }
}

export class ToolMessage extends Message<ToolResultPart> {
  public readonly role = "tool";

  static {
    this.register();
  }

  protected fromString(text: string): ToolResultPart {
    const { success, data } = z
      .object({
        type: z.literal("tool-result"),
        result: z.any(),
        toolName: z.string(),
        toolCallId: z.string(),
      })
      .safeParse(text);

    if (!success) {
      throw new ValueError(`ToolMessage cannot be created from '${text}'!`);
    }

    return data as ToolResultPart;
  }
}

export class SystemMessage extends Message<TextPart> {
  public readonly role: MessageRole = "system";

  static {
    this.register();
  }

  protected fromString(text: string): TextPart {
    return { type: "text", text };
  }
}

export class UserMessage extends Message<TextPart | ImagePart | FilePart> {
  public readonly role = "user";

  static {
    this.register();
  }

  protected fromString(text: string): TextPart {
    return { type: "text", text };
  }
}

export const Role = {
  ASSISTANT: "assistant",
  SYSTEM: "system",
  USER: "user",
} as const;

export class CustomMessage extends Message<MessageContentPart, string> {
  public role: string;

  constructor(role: string, content: MessageContentPart | string, meta: MessageMeta = {}) {
    super(content, meta);
    if (!role) {
      throw new ValueError(`Role "${role}" must be specified!`);
    }
    this.role = role;
  }

  protected fromString(input: string): MessageContentPart {
    return { type: "text", text: input };
  }
}
