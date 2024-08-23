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

import { FrameworkError } from "@/errors.js";
import { Serializable } from "@/internals/serializable.js";

export class RetryCounter extends Serializable {
  public remaining: number;
  protected readonly maxRetries: number;
  protected lastError?: Error;

  constructor(maxRetries = 0) {
    super();
    this.maxRetries = maxRetries;
    this.remaining = maxRetries;
  }

  use(error?: Error) {
    this.lastError = error ?? this.lastError;

    if (this.remaining <= 0) {
      throw new FrameworkError(
        `Maximal amount of global retries '${this.maxRetries}' has been reached!`,
        this.lastError ? [this.lastError] : undefined,
        { isFatal: true },
      );
    }
    this.remaining--;
  }

  createSnapshot() {
    return {
      remaining: this.remaining,
      maxRetries: this.maxRetries,
      lastError: this.lastError,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
