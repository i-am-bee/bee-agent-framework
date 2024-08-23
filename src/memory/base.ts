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
import { FrameworkError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";

export class MemoryError extends FrameworkError {}
export class MemoryFatalError extends MemoryError {
  constructor(message: string, errors?: Error[]) {
    super(message, errors, {
      isFatal: true,
      isRetryable: false,
    });
  }
}

export abstract class BaseMemory<TState = unknown> extends Serializable<TState> {
  abstract get messages(): readonly BaseMessage[];
  abstract add(message: BaseMessage): Promise<void>;
  abstract reset(): void;

  async addMany(messages: Iterable<BaseMessage> | AsyncIterable<BaseMessage>) {
    for await (const msg of messages) {
      await this.add(msg);
    }
  }

  isEmpty() {
    return this.messages.length === 0;
  }

  asReadOnly() {
    return new ReadOnlyMemory(this);
  }

  abstract loadSnapshot(state: TState): void;
  abstract createSnapshot(): TState;
}

export class ReadOnlyMemory<T extends BaseMemory = BaseMemory> extends BaseMemory<{ source: T }> {
  constructor(public readonly source: T) {
    super();
  }

  static {
    this.register();
  }

  // eslint-disable-next-line unused-imports/no-unused-vars
  async add(message: BaseMessage) {}

  get messages(): readonly BaseMessage[] {
    return this.source.messages;
  }

  reset(): void {}

  createSnapshot() {
    return { source: this.source };
  }

  loadSnapshot(state: { source: T }) {
    Object.assign(this, state);
  }
}
