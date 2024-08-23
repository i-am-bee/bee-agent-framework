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

import { ValueOf } from "@/internals/types.js";
import * as R from "remeda";

export function* splitString<T extends string>(
  text: T,
  options: { size: number; overlap: number },
) {
  if (options.overlap >= options.size) {
    throw new Error("overlap must be less than size");
  }
  for (let i = 0; i < text.length; i += options.size - options.overlap) {
    yield text.slice(i, i + options.size);
  }
}

export const Comparator = {
  EQ: [0] as const,
  GT: [1] as const,
  GTE: [0, 1] as const,
  LT: [-1] as const,
  LTE: [-1, 0] as const,
} as const;

export function compareVersion(
  a: string,
  comparator: ValueOf<typeof Comparator>,
  b: string,
): boolean {
  const diff = a.replace("v", "").trim().localeCompare(b.replace("v", "").trim(), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const diffNormalized = Math.min(1, Math.max(-1, diff));
  return R.isIncludedIn(diffNormalized, comparator);
}

export function isJsonLikeString(value: string | undefined): value is string {
  if (!value) {
    return false;
  }
  return value.startsWith("{") && value.endsWith("}");
}

export function halveString(
  value: string,
  seq: string,
  includeSeq = false,
): [string] | [string, string] {
  if (seq === "") {
    return [value];
  }

  const index = value.indexOf(seq);
  if (index === -1) {
    return [value];
  } else {
    return [value.slice(0, index), value.slice(index + (includeSeq ? 0 : seq.length))];
  }
}

export function findFirstPair(text: string, pair: [string, string]): [number, number] | null {
  const [opening, closing] = pair;

  let balance = 0;
  let startIndex = -1;

  for (let index = 0; index < text.length; index++) {
    if (text[index] === opening) {
      if (balance === 0) {
        startIndex = index;
      }
      balance++;
    } else if (text[index] === closing) {
      if (balance > 0) {
        balance--;
        if (balance === 0) {
          return [startIndex, index];
        }
      }
    }
  }

  return null;
}
