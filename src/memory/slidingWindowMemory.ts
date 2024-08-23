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
import { BaseMemory } from "@/memory/base.js";
import { shallowCopy } from "@/serializer/utils.js";

export interface SlidingWindowMemoryInput {
  size: number;
}

export class SlidingWindowMemory extends BaseMemory {
  public readonly messages: BaseMessage[];

  constructor(public config: SlidingWindowMemoryInput) {
    super();
    this.messages = [];
  }

  static {
    this.register();
  }

  async add(message: BaseMessage) {
    if (this.messages.length + 1 > this.config.size) {
      this.messages.shift();
    }
    this.messages.push(message);
  }

  reset() {
    this.messages.length = 0;
  }

  createSnapshot() {
    return { config: shallowCopy(this.config), messages: shallowCopy(this.messages) };
  }

  loadSnapshot(state: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, state);
  }
}
