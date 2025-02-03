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

import { ChatModel, ChatModelEvents, ChatModelOutput, ChatModelInput } from "@/backend/chat.js";
import { RunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";
import { NotImplementedError } from "@/errors.js";

export class DummyChatModel extends ChatModel {
  public readonly emitter = Emitter.root.child<ChatModelEvents>({
    namespace: ["backend", "dummy", "chat"],
    creator: this,
  });

  constructor(public readonly modelId = "dummy") {
    super();
  }

  get providerId(): string {
    return "dummy";
  }

  protected _create(input: ChatModelInput, run: RunContext<this, any>): Promise<ChatModelOutput> {
    throw new NotImplementedError();
  }

  protected _createStream(
    input: ChatModelInput,
    run: RunContext<this, any>,
  ): AsyncGenerator<ChatModelOutput, ChatModelOutput> {
    throw new NotImplementedError();
  }

  createSnapshot() {
    return { modelId: this.modelId };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    Object.assign(this, snapshot);
  }
}
