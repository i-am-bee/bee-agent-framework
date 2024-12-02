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

import { Serializer } from "@/serializer/serializer.js";
import { ClassConstructor, PromiseOrPlain } from "@/internals/types.js";
import * as R from "remeda";
import { extractClassName } from "@/serializer/utils.js";
import { SerializerError } from "@/serializer/error.js";
import { Cache } from "@/cache/decoratorCache.js";
import { startMetricNodeSdkReader } from "@/instrumentation/sdk.js";

startMetricNodeSdkReader();

export type SerializableClass<T> = ClassConstructor<Serializable<T>> &
  Pick<typeof Serializable<T>, "fromSnapshot" | "fromSerialized">;

interface SerializableStructure<T> {
  target: string;
  snapshot: T;
}

interface DeserializeOptions {
  extraClasses?: SerializableClass<unknown>[];
}

export abstract class Serializable<T = unknown> {
  abstract createSnapshot(): T;
  abstract loadSnapshot(snapshot: T): void;

  constructor() {
    Object.getPrototypeOf(this).constructor.register();
    Cache.init(this);
  }

  protected static register<T>(this: SerializableClass<T>, aliases?: string[]) {
    Serializer.registerSerializable(this, undefined, aliases);
  }

  clone<T extends Serializable>(this: T): T {
    const snapshot = this.createSnapshot();

    const target = Object.create(this.constructor.prototype);
    target.loadSnapshot(snapshot);
    return target;
  }

  serialize(): string {
    const snapshot = this.createSnapshot();
    return Serializer.serialize<SerializableStructure<T>>({
      target: extractClassName(this),
      snapshot,
    });
  }

  protected deserialize(value: string, options?: DeserializeOptions): T {
    const { __root } = Serializer.deserializeWithMeta<SerializableStructure<T>>(
      value,
      options?.extraClasses,
    );
    if (!__root.target) {
      // eslint-disable-next-line
      console.warn(
        `Serializable class must be serialized via "serialize" method and not via Serializer class. This may lead to incorrect deserialization.`,
      );
      return __root as T;
    }

    const current = extractClassName(this);
    if (current !== __root.target) {
      throw new SerializerError(
        `Snapshot has been created for class '${__root.target}' but you want to use it for class '${current}'.`,
      );
    }
    return __root.snapshot;
  }

  static fromSnapshot<T, P>(
    this: new (...args: any[]) => T extends Serializable<P> ? T : never,
    state: P,
  ): T {
    const target = Object.create(this.prototype);
    target.loadSnapshot(state);
    Cache.init(target);
    return target;
  }

  static fromSerialized<T extends Serializable>(
    this: abstract new (...args: any[]) => T,
    serialized: string,
    options: DeserializeOptions = {},
  ): PromiseOrPlain<T, T["loadSnapshot"]> {
    const target = Object.create(this.prototype) as T;
    const state = target.deserialize(serialized, options);
    const load = target.loadSnapshot(state);
    Cache.init(target);

    return (R.isPromise(load) ? load.then(() => target) : target) as PromiseOrPlain<
      T,
      T["loadSnapshot"]
    >;
  }
}
