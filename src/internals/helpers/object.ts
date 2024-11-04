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

import * as R from "remeda";
import { FrameworkError } from "@/errors.js";

export type Override<T, T2 extends Partial<T>> = {
  [K in keyof T2]: K extends keyof T ? T2[K] : never;
};

export function assignFactory<T extends NonNullable<unknown>, T2 extends Partial<T>>(target: T) {
  return (source: NonNullable<Override<T, T2>>) => {
    Object.assign(target, source);
  };
}

export const assign = <T extends NonNullable<unknown>, T2 extends Partial<T>>(
  a: T,
  b: NonNullable<Override<T, T2>>,
) => assignFactory(a)(b);
export const omitEmptyValues = R.pickBy(R.isTruthy);
export const omitUndefined = R.pickBy(R.isDefined);

export function hasProp<T>(target: T | undefined, key: keyof T): key is keyof T {
  return Boolean(target) && Object.prototype.hasOwnProperty.call(target, key);
}

export function hasProps<T>(keys: (keyof T)[]) {
  return (target: T | undefined) => keys.every((key) => hasProp(target, key));
}

export function setProp(target: unknown, paths: readonly (keyof any)[], value: unknown) {
  for (const entry of paths.entries()) {
    const [idx, key] = entry as [number, keyof object];
    if (!R.isPlainObject(target) && !R.isArray(target)) {
      throw new TypeError("Only plain objects and arrays are supported!");
    }

    const isLast = idx === paths.length - 1;
    const newValue = isLast ? value : (target[key] ?? {});
    Object.assign(target, { [key]: newValue });
    target = target[key];
  }
}

export function getPropStrict(target: NonNullable<unknown>, path: string): any {
  if (!target || !(path in target)) {
    throw new TypeError(`Target does not contain key "${path}"`);
  }
  return target[path as keyof typeof target];
}

export function getProp(
  target: unknown,
  paths: readonly (keyof any)[],
  defaultValue: any = undefined,
) {
  let value: any = target;
  if (!value) {
    return undefined;
  }

  for (const key of paths) {
    if (!hasProp(value, key)) {
      return defaultValue;
    }
    value = value[key];
  }
  return value;
}

export function deleteProps<T, K extends keyof T>(target: T, keys: readonly K[]) {
  keys.forEach((key) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete target[key];
  });
}

export function updateObject<T extends object, L extends object>(
  old: T,
  update: L,
): asserts old is T & L {
  for (const [key, val] of Object.entries(update)) {
    const existing = old[key as keyof T];
    if (existing !== undefined && existing !== null) {
      throw new FrameworkError(
        `Cannot update object. Key '${key}' already exists and is defined.`,
        [],
        {
          context: {
            existing,
            update: val,
          },
        },
      );
    }
    old[key as keyof T] = val;
  }
}

export function createNonOverridableObject<T extends object>(target: T) {
  return new Proxy<typeof target>(target, {
    set(target: any, k: keyof any, v) {
      const existingValue = target[k];
      if (existingValue === undefined || existingValue === null) {
        target[k] = v;
        return true;
      }

      // eslint-disable-next-line
      console.error(`Property '${String(k)}' already exists. Cannot set value.`);
      return false;
    },
  });
}

export function customMerge<T extends NonNullable<unknown>>(
  results: T[],
  processors: {
    [K in keyof T]: (value: T[K], oldValue: T[K]) => T[K];
  },
) {
  if (results.length === 0) {
    throw new TypeError("Cannot merge content of an empty array!");
  }

  const finalResult = {} as T;
  for (const next of results) {
    for (const [key, value] of R.entries(next)) {
      const oldValue = finalResult[key as keyof T];
      // @ts-expect-error weak typing due to  generated types
      finalResult[key] = (processors[key] ?? R.takeFirstBy(1))(value, oldValue);
    }
  }
  return finalResult;
}
