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
import { ValueError } from "@/errors.js";
import { unique } from "remeda";

export function* splitString(
  text: string,
  options: { size: number; overlap: number; trim?: boolean },
) {
  yield* recursiveSplitString(text, { ...options, trim: options?.trim ?? false, separators: [] });
}

export function* mergeStrings(
  chunks: string[],
  sep: string,
  options: { size: number; overlap: number; trim?: boolean },
) {
  const tmpChunks: string[] = [];
  let tmpOverlap = 0;

  const toDoc = (parts: string[]) => {
    const text = parts.join(sep);
    return options.trim ? text.trim() : text;
  };

  for (const chunk of chunks) {
    if (tmpOverlap + chunk.length + tmpChunks.length * sep.length > options.size) {
      if (tmpChunks.length > 0) {
        const doc = toDoc(tmpChunks);
        if (doc) {
          yield doc;
        }

        while (
          tmpOverlap > options.overlap ||
          (tmpOverlap + chunk.length + tmpChunks.length * sep.length > options.size &&
            tmpOverlap > 0)
        ) {
          const tmp = tmpChunks.shift()!;
          tmpOverlap -= tmp.length;
        }
      }
    }
    tmpChunks.push(chunk);
    tmpOverlap += chunk.length;
  }

  const doc = toDoc(tmpChunks);
  if (doc) {
    yield doc;
  }
}

export function* recursiveSplitString(
  text: string,
  options: { size: number; overlap: number; separators: string[]; trim?: boolean },
): Generator<string> {
  if (options.size <= 0 || options.overlap < 0) {
    throw new Error("size must be positive and overlap must be non-negative");
  }
  if (options.overlap >= options.size) {
    throw new Error("overlap must be less than size");
  }

  const goodSplits: string[] = [];
  const [separator, ...remainingSeparators] = unique([...(options.separators ?? []), ""]);

  for (const chunk of text.split(separator).filter(Boolean)) {
    if (chunk.length < options.size) {
      goodSplits.push(chunk);
      continue;
    }

    if (goodSplits.length > 0) {
      yield* mergeStrings(goodSplits, separator, options);
      goodSplits.length = 0;
    }

    if (remainingSeparators.length === 0) {
      yield chunk;
    } else {
      yield* recursiveSplitString(chunk, { ...options, separators: remainingSeparators });
    }
  }

  if (goodSplits.length > 0) {
    yield* mergeStrings(goodSplits, separator, options);
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

export function findFirstPair(text: string, pair: [string, string]) {
  const [opening, closing] = pair || [];
  if (!pair || !opening || !closing) {
    throw new ValueError(`The "pair" parameter is required and must be non-empty!`);
  }

  let balance = 0;
  let startIndex = -1;

  const isSame = opening === closing;
  for (let index = 0; index < text.length; index++) {
    if (text.substring(index, index + opening.length) === opening && (!isSame || balance === 0)) {
      if (balance === 0) {
        startIndex = index;
      }
      balance++;
    } else if (text.substring(index, index + closing.length) === closing) {
      if (balance > 0) {
        balance--;
        if (balance === 0) {
          return {
            start: startIndex,
            end: index + closing.length,
            pair,
            inner: text.substring(startIndex + opening.length, index),
            outer: text.substring(startIndex, index + closing.length),
          };
        }
      }
    }
  }

  return null;
}
