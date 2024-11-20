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
import { MilvusDatabaseTool, MilvusToolOptions, MilvusAction } from "@/tools/database/milvus.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { JSONToolOutput } from "@/tools/base.js";
import { SlidingCache } from "@/cache/slidingCache.js";
import { Task } from "promise-based-task";

const mockClient = {
  listCollections: vi.fn(),
  describeCollection: vi.fn(),
  search: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@zilliz/milvus2-sdk-node", () => ({
  MilvusClient: vi.fn(() => mockClient),
}));

describe("MilvusDatabaseTool", () => {
  let milvusDatabaseTool: MilvusDatabaseTool;

  beforeEach(() => {
    vi.clearAllMocks();
    milvusDatabaseTool = new MilvusDatabaseTool({
      connection: { address: "localhost:19530" },
    } as MilvusToolOptions);
  });

  it("throws a missing collection name error", async () => {
    await expect(
      milvusDatabaseTool.run({ action: MilvusAction.GetCollectionInfo }),
    ).rejects.toThrow("Collection name is required for Milvus GetCollectionInfo action.");
  });

  it("throws missing collection name and vector error", async () => {
    await expect(milvusDatabaseTool.run({ action: MilvusAction.Search })).rejects.toThrow(
      "Both collection name and vector are required for SEARCH action.",
    );
  });

  it("lists collections correctly", async () => {
    const mockCollections = { data: ["collection1", "collection2"] };
    mockClient.listCollections.mockResolvedValueOnce(mockCollections);

    const response = await milvusDatabaseTool.run({ action: MilvusAction.ListCollections });
    expect(response.result).toEqual(["collection1", "collection2"]);
  });

  it("gets collection info", async () => {
    const collectionName = "collection1";
    const mockCollectionInfo = {
      schema: { fields: [{ name: "vector", type: "FLOAT_VECTOR", params: { dim: 128 } }] },
    };
    mockClient.describeCollection.mockResolvedValueOnce(mockCollectionInfo);

    const response = await milvusDatabaseTool.run({
      action: MilvusAction.GetCollectionInfo,
      collectionName,
    });
    expect(response.result).toEqual(mockCollectionInfo);
  });
});
