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

import * as R from "remeda";
import { SafeWeakSet } from "@/internals/helpers/weakRef.js";
import { AnyConstructable, AnyFn, ClassConstructor, NamedFunction } from "@/internals/types.js";
import { SerializeFactory } from "@/serializer/serializer.js";
import { getProp, hasProp } from "@/internals/helpers/object.js";
import { isDirectInstanceOf } from "@/internals/helpers/prototype.js";
import { SerializerError } from "@/serializer/error.js";

export const SerializerSelfRefIdentifier = "__self_ref";
export const SerializerRefIdentifier = "__ref";
export class ClassConstructorPlaceholder {}
export class RefPlaceholder<T = unknown> {
  private static EmptyPlaceholder = Symbol();
  private partialResult: T = RefPlaceholder.EmptyPlaceholder as T;

  constructor(
    protected readonly node: SerializerNode,
    protected readonly factory: SerializeFactory<T>,
  ) {}

  get value() {
    if (this.partialResult !== RefPlaceholder.EmptyPlaceholder) {
      return this.partialResult;
    }

    const { createEmpty, updateInstance } = this.factory;
    if (!createEmpty || !updateInstance) {
      throw new SerializerError("Circular dependency has been detected!");
    }

    this.partialResult = createEmpty();
    return this.partialResult;
  }

  async final() {
    const finalInstance = await this.factory.fromPlain(this.node.__value, this.factory.ref);
    if (this.partialResult === RefPlaceholder.EmptyPlaceholder) {
      return finalInstance;
    }

    await this.factory.updateInstance!(this.partialResult, finalInstance);
    return this.partialResult;
  }
}

export interface SerializerNode {
  __class: string;
  __ref: string;
  __value: unknown;
  __serializer: true;
}
export function isSerializerNode(data: unknown): data is SerializerNode {
  return R.isPlainObject(data) && hasProp(data as unknown as SerializerNode, "__serializer");
}

export interface RootNode<T = any> {
  __version: string;
  __root: T;
}

export function isRootNode<T>(data: unknown): data is RootNode<T> {
  return (
    R.isPlainObject(data) &&
    hasProp(data as unknown as RootNode<T>, "__root") &&
    hasProp(data as unknown as RootNode<T>, "__version")
  );
}

export const extractClassName = (() => {
  const registry = new Map<string, unknown[]>();
  const register = (name: string, factory: any) => {
    if (!registry.has(name)) {
      registry.set(name, []);
    }
    const target = registry.get(name)!;
    let index = target.indexOf(factory);
    if (index === -1) {
      index = target.push(factory) - 1;
    }
    return [name, index].filter(Boolean).join("");
  };

  return (value: unknown): string => {
    if (R.isObjectType(value) && "constructor" in value) {
      const name = value.constructor.name;
      return register(name, value.constructor);
    }
    if (R.isFunction(value)) {
      const name = value.name || value.constructor?.name || Function.name;
      return register(name, value);
    }
    return extractClassName(primitiveToSerializableClass(value));
  };
})();

const ClassByValueType = {
  string: String,
  number: Number,
  bigint: BigInt,
  boolean: Boolean,
  symbol: Symbol,
  undefined: class Undefined {},
  null: class Null {},
  object: Object,
  function: Function,
} as const;

export function primitiveToSerializableClass(value: unknown) {
  const type = value === null ? "null" : typeof value;
  return ClassByValueType[type];
}

type TraverseObjectFn = (el: { key: string; path: readonly string[]; value: any }) => Promise<void>;
export async function traverseObject(
  obj: unknown,
  handler: TraverseObjectFn,
  stopFn?: (_obj: unknown) => boolean,
) {
  const seen = new SafeWeakSet();

  const traverse = async (_obj: unknown, path: readonly string[] = []) => {
    if (!R.isPlainObject(_obj) || seen.has(_obj)) {
      return;
    }
    seen.add(_obj);

    if (stopFn?.(_obj)) {
      return;
    }

    for (const [key, value] of Object.entries(_obj)) {
      await traverse(value, path.concat(key));
      await handler({
        key,
        value,
        path: path.concat(key),
      });
    }
  };

  return await traverse(obj, []);
}

export function isSerializationRequired(factory: ClassConstructor | NamedFunction) {
  const primitive: unknown[] = [ClassByValueType.string, ClassByValueType.boolean];
  return !primitive.includes(factory);
}

export function* traverseWithUpdate<T = unknown>(
  _obj: unknown,
): Generator<{ value: T; update: (value: T) => void }> {
  if (Array.isArray(_obj)) {
    for (const [idx, value] of _obj.entries()) {
      yield {
        value,
        update: (newValue) => {
          _obj[idx] = newValue;
        },
      };
    }
  } else if (R.isPlainObject(_obj)) {
    for (const [key, value] of R.entries(_obj)) {
      yield {
        value: value as T,
        update: (newValue) => {
          _obj[key] = newValue;
        },
      };
    }
  } else if (_obj instanceof Map) {
    for (const [key, value] of _obj.entries()) {
      yield {
        value,
        update: (newValue) => {
          _obj.set(key, newValue);
        },
      };
    }
  } else if (_obj instanceof Set) {
    for (const value of _obj.values()) {
      yield {
        value,
        update: (newValue) => {
          _obj.delete(value);
          _obj.add(newValue);
        },
      };
    }
  }
}

export function shallowCopy<T>(value: T): T {
  if (R.isPlainObject(value)) {
    return Object.assign({}, value);
  } else if (R.isArray(value)) {
    return value.slice() as T;
  } else if (isDirectInstanceOf(value, Map)) {
    return new Map(value.entries()) as T;
  } else if (isDirectInstanceOf(value, Set)) {
    return new Set(value.values()) as T;
  } else if (isDirectInstanceOf(value, Date)) {
    return new Date(value) as T;
  }
  return value;
}

type Bounded =
  | {
      name: string;
      value: any;
    }
  | AnyConstructable;

export function toBoundedFunction<T extends AnyFn>(fn: T, binds: [Bounded, ...Bounded[]]) {
  Object.assign(fn, { [toBoundedFunction.symbol]: binds });
  return fn;
}
toBoundedFunction.symbol = Symbol("bounded");

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function getFunctionBinds<T extends Function>(fn: T) {
  const target = getProp(fn, [toBoundedFunction.symbol], []);
  return target as Bounded[];
}
