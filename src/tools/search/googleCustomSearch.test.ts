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

import { GoogleSearchTool, GoogleSearchToolOutput } from "@/tools/search/googleCustomSearch.js";
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
      maxResultsPerPage: 10,
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
    expect(googleSearchTool.name).toBe("GoogleCustomSearch");
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
        num: 10,
        start: 1,
        safe: "active",
      },
      {
        signal: undefined,
      },
    );
  });

  it("validates maxResultsPerPage range", () => {
    expect(
      () =>
        new GoogleSearchTool({
          apiKey: "test-api-key",
          cseId: "test-cse-id",
          maxResultsPerPage: 0,
        }),
    ).toThrowError("validation failed");
    expect(
      () =>
        new GoogleSearchTool({
          apiKey: "test-api-key",
          cseId: "test-cse-id",
          maxResultsPerPage: 11,
        }),
    ).toThrowError("validation failed");
  });

  it("paginates correctly", async () => {
    const query = "paginated search";
    const mockFirstPageResults = generateResults(10);
    const mockSecondPageResults = generateResults(10);

    mockCustomSearchClient.cse.list
      .mockResolvedValueOnce(mockFirstPageResults)
      .mockResolvedValueOnce(mockSecondPageResults);

    const responsePage1 = await googleSearchTool.run({ query });
    const responsePage2 = await googleSearchTool.run({ query, page: 2 });

    const combinedResults = [...responsePage1.results, ...responsePage2.results];

    expect(combinedResults.length).toBe(20);

    expect(mockCustomSearchClient.cse.list).toHaveBeenCalledTimes(2);
    expect(mockCustomSearchClient.cse.list).toHaveBeenNthCalledWith(
      1,
      {
        cx: "test-cse-id",
        q: query,
        num: 10,
        start: 1,
        safe: "active",
      },
      {
        signal: undefined,
      },
    );
    expect(mockCustomSearchClient.cse.list).toHaveBeenNthCalledWith(
      2,
      {
        cx: "test-cse-id",
        q: query,
        num: 10,
        start: 11,
        safe: "active",
      },
      {
        signal: undefined,
      },
    );
  });

  it("Serializes", async () => {
    const tool = new GoogleSearchTool({
      apiKey: "test-api-key",
      cseId: "test-cse-id",
      maxResultsPerPage: 1,
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
