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

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ElasticSearchTool, ElasticSearchToolOptions } from "@/tools/database/elasticsearch.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { JSONToolOutput } from "@/tools/base.js";
import { SlidingCache } from "@/cache/slidingCache.js";
import { Task } from "promise-based-task";

vi.mock("@elastic/elasticsearch");

describe("ElasticSearchTool", () => {
  let elasticSearchTool: ElasticSearchTool;
  const mockClient = {
    cat: { indices: vi.fn() },
    indices: { getMapping: vi.fn() },
    search: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    elasticSearchTool = new ElasticSearchTool({
      connection: { node: "http://localhost:9200" },
    } as ElasticSearchToolOptions);

    Object.defineProperty(elasticSearchTool, "client", {
      get: () => mockClient,
    });
  });

  it("lists indices correctly", async () => {
    const mockIndices = [{ index: "index1" }, { index: "index2" }];
    mockClient.cat.indices.mockResolvedValueOnce(mockIndices);

    const response = await elasticSearchTool.run({ action: "LIST_INDICES" });
    expect(response.result).toEqual([{ index: "index1" }, { index: "index2" }]);
  });

  it("gets index details", async () => {
    const indexName = "index1";
    const mockIndexDetails = {
      [indexName]: { mappings: { properties: { field1: { type: "text" } } } },
    };
    mockClient.indices.getMapping.mockResolvedValueOnce(mockIndexDetails);

    const response = await elasticSearchTool.run({ action: "GET_INDEX_DETAILS", indexName });
    expect(response.result).toEqual(mockIndexDetails);
    expect(mockClient.indices.getMapping).toHaveBeenCalledWith(
      { index: indexName },
      { signal: undefined },
    );
  });

  it("performs a search", async () => {
    const indexName = "index1";
    const query = JSON.stringify({ query: { match_all: {} } });
    const mockSearchResponse = { hits: { hits: [{ _source: { field1: "value1" } }] } };
    mockClient.search.mockResolvedValueOnce(mockSearchResponse);

    const response = await elasticSearchTool.run({
      action: "SEARCH",
      indexName,
      query,
      start: 0,
      size: 1,
    });
    expect(response.result).toEqual([{ field1: "value1" }]);
  });

  it("throws invalid JSON format error", async () => {
    await expect(async () => {
      await elasticSearchTool.run({ action: "SEARCH", indexName: "index1", query: "invalid" });
    }).rejects.toThrowError(
      expect.objectContaining({
        message: expect.stringContaining("Invalid JSON format for query"),
      }),
    );
  });

  it("throws missing index name error", async () => {
    await expect(elasticSearchTool.run({ action: "GET_INDEX_DETAILS" })).rejects.toThrow(
      "Index name is required for GET_INDEX_DETAILS action.",
    );
  });

  it("throws missing index and query error", async () => {
    await expect(elasticSearchTool.run({ action: "SEARCH" })).rejects.toThrow(
      "Both index name and query are required for SEARCH action.",
    );
  });

  it("serializes", async () => {
    const elasticSearchTool = new ElasticSearchTool({
      connection: { node: "http://localhost:9200" },
      cache: new SlidingCache({
        size: 10,
        ttl: 1000,
      }),
    });

    await elasticSearchTool.cache!.set(
      "connection",
      Task.resolve(new JSONToolOutput([{ index: "index1", detail: "sample" }])),
    );

    const serialized = elasticSearchTool.serialize();
    const deserializedTool = ElasticSearchTool.fromSerialized(serialized);

    expect(await deserializedTool.cache.get("connection")).toStrictEqual(
      await elasticSearchTool.cache.get("connection"),
    );
    verifyDeserialization(elasticSearchTool, deserializedTool);
  });
});
