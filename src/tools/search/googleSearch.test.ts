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

import { GoogleSearchTool, GoogleSearchToolOutput } from "@/tools/search/googleSearch.js";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { SlidingCache } from "@/cache/slidingCache.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { Task } from "promise-based-task";

vi.mock("@googleapis/customsearch");

describe("GoogleCustomSearch Tool", () => {
  let googleSearchTool: GoogleSearchTool;
  const mockCustomSearchClient = {
    cse: {
      list: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    googleSearchTool = new GoogleSearchTool({
      apiKey: "test-api-key",
      cseId: "test-cse-id",
      maxResults: 10,
    });

    Object.defineProperty(googleSearchTool, "client", {
      get: () => mockCustomSearchClient,
    });
  });

  const generateResults = (count: number) => {
    return {
      data: {
        items: Array(count)
          .fill(null)
          .map((_, i) => ({
            title: `Result ${i + 1}`,
            snippet: `Description for result ${i + 1}`,
            link: `https://example.com/${i + 1}`,
          })),
      },
    };
  };

  it("is a valid tool", () => {
    expect(googleSearchTool).toBeDefined();
    expect(googleSearchTool.name).toBe("GoogleSearch");
    expect(googleSearchTool.description).toBeDefined();
  });

  it("retrieves data with the correct number of results", async () => {
    const query = "IBM Research";
    const mockResults = generateResults(3);

    mockCustomSearchClient.cse.list.mockResolvedValueOnce(mockResults);

    const response = await googleSearchTool.run({ query });

    expect(response).toBeInstanceOf(GoogleSearchToolOutput);
    expect(response.results.length).toBe(3);
    expect(mockCustomSearchClient.cse.list).toHaveBeenCalledWith(
      {
        cx: "test-cse-id",
        q: query,
        start: 0,
        num: 10,
        safe: "active",
      },
      {
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("validates maxResults range", () => {
    expect(
      () =>
        new GoogleSearchTool({
          apiKey: "test-api-key",
          cseId: "test-cse-id",
          maxResults: 0,
        }),
    ).toThrowError("validation failed");
    expect(
      () =>
        new GoogleSearchTool({
          apiKey: "test-api-key",
          cseId: "test-cse-id",
          maxResults: 111,
        }),
    ).toThrowError("validation failed");
  });

  it("Serializes", async () => {
    const tool = new GoogleSearchTool({
      apiKey: "test-api-key",
      cseId: "test-cse-id",
      maxResults: 1,
      cache: new SlidingCache({
        size: 10,
        ttl: 1000,
      }),
    });

    await tool.cache!.set(
      "A",
      Task.resolve(
        new GoogleSearchToolOutput([
          {
            title: "A",
            url: "http://example.com",
            description: "A",
          },
        ]),
      ),
    );

    await tool.cache!.set("B", Task.resolve(new GoogleSearchToolOutput([])));
    const serialized = tool.serialize();
    const deserialized = GoogleSearchTool.fromSerialized(serialized);
    expect(await tool.cache.get("A")).toStrictEqual(await deserialized.cache.get("A"));
    verifyDeserialization(tool, deserialized);
  });
});
