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
import { FrameworkError, FrameworkErrorOptions } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";

export class MemoryError extends FrameworkError {}
export class MemoryFatalError extends MemoryError {
  constructor(message: string, errors?: Error[], options?: FrameworkErrorOptions) {
    super(message, errors, {
      isFatal: true,
      isRetryable: false,
      ...options,
    });
  }
}

export abstract class BaseMemory<TState = unknown> extends Serializable<TState> {
  abstract get messages(): readonly BaseMessage[];

  abstract add(message: BaseMessage, index?: number): Promise<void>;

  abstract delete(message: BaseMessage): Promise<boolean>;
  abstract reset(): void;

  async addMany(messages: Iterable<BaseMessage> | AsyncIterable<BaseMessage>, start?: number) {
    let counter = 0;
    for await (const msg of messages) {
      await this.add(msg, start === undefined ? undefined : start + counter);
      counter += 1;
    }
  }

  async deleteMany(messages: Iterable<BaseMessage> | AsyncIterable<BaseMessage>) {
    for await (const msg of messages) {
      await this.delete(msg);
    }
  }

  async splice(start: number, deleteCount: number, ...items: BaseMessage[]) {
    const total = this.messages.length;

    start = start < 0 ? Math.max(total + start, 0) : start;
    deleteCount = Math.min(deleteCount, total - start);

    const deletedItems = this.messages.slice(start, start + deleteCount);
    await this.deleteMany(deletedItems);
    await this.addMany(items, start);

    return deletedItems;
  }

  isEmpty() {
    return this.messages.length === 0;
  }

  asReadOnly() {
    return new ReadOnlyMemory(this);
  }

  [Symbol.iterator]() {
    return this.messages[Symbol.iterator]();
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
  async add(message: BaseMessage, index?: number) {}

  // eslint-disable-next-line unused-imports/no-unused-vars
  async delete(message: BaseMessage) {
    return false;
  }

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
