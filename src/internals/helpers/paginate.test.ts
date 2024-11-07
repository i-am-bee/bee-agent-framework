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

import { paginate, PaginateInput } from "@/internals/helpers/paginate.js";

describe("paginate", () => {
  it.each([
    {
      size: 1,
      chunkSize: 1,
      items: Array(100).fill(1),
    },
    {
      size: 10,
      chunkSize: 1,
      items: [],
    },
    {
      size: 11,
      chunkSize: 10,
      items: Array(100).fill(1),
    },
    {
      size: 25,
      chunkSize: 1,
      items: Array(20).fill(1),
    },
  ])("Works %#", async ({ size, items, chunkSize }) => {
    const fn: PaginateInput<number>["handler"] = vi.fn().mockImplementation(async ({ offset }) => {
      const chunk = items.slice(offset, offset + chunkSize);
      return { done: offset + chunk.length >= items.length, data: chunk };
    });

    const results = await paginate({
      size,
      handler: fn,
    });

    const maxItemsToBeRetrieved = Math.min(size, items.length);
    let expectedCalls = Math.ceil(maxItemsToBeRetrieved / chunkSize);
    if (expectedCalls === 0 && size > 0) {
      expectedCalls = 1;
    }
    expect(fn).toBeCalledTimes(expectedCalls);
    expect(results).toHaveLength(maxItemsToBeRetrieved);
  });
});
