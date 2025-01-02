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

export interface PaginateInput<T> {
  size: number;
  handler: (data: { offset: number; limit: number }) => Promise<{ data: T[]; done: boolean }>;
}

export async function paginate<T>(input: PaginateInput<T>): Promise<T[]> {
  const acc: T[] = [];

  while (acc.length < input.size) {
    const { data, done } = await input.handler({
      offset: acc.length,
      limit: input.size - acc.length,
    });
    acc.push(...data);

    if (done || data.length === 0) {
      break;
    }
  }

  if (acc.length > input.size) {
    acc.length = input.size;
  }

  return acc;
}

export interface PaginateWithCursorInput<T, C> {
  size: number;
  handler: (data: {
    cursor: C | undefined;
    limit: number;
  }) => Promise<{ data: T[]; done: true } | { data: T[]; done: false; nextCursor: C }>;
}

export async function paginateWithCursor<T, C>(input: PaginateWithCursorInput<T, C>): Promise<T[]> {
  const acc: T[] = [];
  let cursor: C | undefined;
  while (acc.length < input.size) {
    const result = await input.handler({
      cursor,
      limit: input.size - acc.length,
    });
    acc.push(...result.data);

    if (result.done || result.data.length === 0) {
      break;
    } else {
      cursor = result.nextCursor;
    }
  }

  if (acc.length > input.size) {
    acc.length = input.size;
  }

  return acc;
}
