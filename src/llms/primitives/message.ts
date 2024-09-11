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

import { EnumLowerCaseValue } from "@/internals/types.js";
import { Serializable } from "@/internals/serializable.js";
import { shallowCopy } from "@/serializer/utils.js";

export const Role = {
  ASSISTANT: "assistant",
  SYSTEM: "system",
  USER: "user",
} as const;

export type RoleType = EnumLowerCaseValue<typeof Role> | string;

export interface BaseMessageMeta {
  [key: string]: any;
  createdAt?: Date;
}

export interface BaseMessageInput {
  role: RoleType;
  text: string;
  meta?: BaseMessageMeta;
}

export class BaseMessage extends Serializable {
  constructor(
    public readonly role: RoleType,
    public readonly text: string,
    public readonly meta?: BaseMessageMeta,
  ) {
    super();
  }

  static {
    this.register();
  }

  static of({ role, text, meta }: BaseMessageInput) {
    return new BaseMessage(role, text, meta);
  }

  createSnapshot() {
    return {
      role: this.role,
      text: this.text,
      meta: shallowCopy(this.meta),
    };
  }

  loadSnapshot(state: ReturnType<typeof this.createSnapshot>) {
    return Object.assign(this, state);
  }
}
