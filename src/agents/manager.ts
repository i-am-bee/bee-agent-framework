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

import { BaseAgent } from "@/agents/base.js";

export abstract class BaseAgentManager<
  T extends BaseAgent<any, any, any>,
  PDefault extends readonly any[],
  POverride,
> {
  public readonly instances: Set<WeakRef<T>>;
  public readonly defaults: PDefault;

  constructor(...defaults: PDefault) {
    this.defaults = defaults;
    this.instances = new Set<WeakRef<T>>();
  }

  protected abstract _create(overrides: POverride): T;

  create(overrides: POverride): T {
    const instance = this._create(overrides);
    const ref = new WeakRef<T>(instance);
    this.instances.add(ref);
    return instance;
  }

  destroy() {
    for (const weakRef of Array.from(this.instances.values())) {
      this.instances.delete(weakRef);

      const instance = weakRef.deref();
      if (instance) {
        instance.destroy();
      }
    }
  }
}
