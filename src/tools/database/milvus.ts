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

import {
  Tool,
  ToolInput,
  ToolError,
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
} from "@/tools/base.js";
import { Cache } from "@/cache/decoratorCache.js";
import { ValidationError } from "ajv";
import { RunContext } from "@/context.js";
import {
  ClientConfig,
  MilvusClient,
  SearchRes,
  ShowCollectionsResponse,
  DescribeCollectionResponse,
} from "@zilliz/milvus2-sdk-node";
import { z } from "zod";

export interface MilvusToolOptions extends BaseToolOptions {
  connection: ClientConfig;
}

export type MilvusSearchToolResult =
  | ShowCollectionsResponse
  | DescribeCollectionResponse
  | SearchRes;

enum MilvusAction {
  ListCollections = "ListCollections",
  GetCollectionInfo = "GetCollectionInfo",
  Search = "Search",
  Insert = "Insert",
  Delete = "Delete",
}

export class MilvusDatabaseTool extends Tool<
  JSONToolOutput<MilvusSearchToolResult>,
  MilvusToolOptions
> {
  name = "MilvusDatabaseTool";

  description = `Can query data from a Milvus database. IMPORTANT: strictly follow this order of actions:
   1. ${MilvusAction.ListCollections} - List all the Milvus collections
   2. ${MilvusAction.GetCollectionInfo} - Get information about into a Milvus collection
   3. ${MilvusAction.Insert} - Insert data into a Milvus collection
   3. ${MilvusAction.Search} - Perform search on a Milvus collection
   4. ${MilvusAction.Delete} - Delete from a Milvus collection`;

  private client: MilvusClient;
  private collection: string;

  constructor(url: string, collection: string, options: MilvusToolOptions) {
    super(options);
    this.client = new MilvusClient(url);
    this.collection = collection;
  }

  inputSchema() {
    return z.object({
      action: z
        .nativeEnum(MilvusAction)
        .describe(
          `The action to perform. ${MilvusAction.ListCollections} lists all collections, ${MilvusAction.GetCollectionInfo} fetches details for a specified collection, ${MilvusAction.Search} executes a vector search, ${MilvusAction.Insert} inserts new vectors, and ${MilvusAction.Delete} removes vectors.`,
        ),
      collectionName: z
        .string()
        .optional()
        .describe(
          `The name of the collection to query, required for ${MilvusAction.GetCollectionInfo}, ${MilvusAction.Search}, ${MilvusAction.Insert}, and ${MilvusAction.Delete}`,
        ),
      vector: z
        .array(z.number())
        .optional()
        .describe(`The vector to search for or insert, required for ${MilvusAction.Search}`),
      vectors: z
        .array(z.array(z.number()).optional())
        .describe(`The vectors to insert, required for ${MilvusAction.Insert}`),
      topK: z.coerce
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(10)
        .optional()
        .describe(
          `The number of nearest neighbors to return for ${MilvusAction.Search}. Maximum is 1000`,
        ),
      filter: z
        .string()
        .optional()
        .describe(`Optional filter expression for ${MilvusAction.Search}`),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe(`Additional metadata to insert with vectors for ${MilvusAction.Insert}`),
      ids: z
        .array(z.string().or(z.number()))
        .optional()
        .describe(`Array of IDs to delete for ${MilvusAction.Delete}`),
      searchOutput: z
        .array(z.string())
        .optional()
        .describe(`Fields to return in search results for ${MilvusAction.Search}`),
    });
  }

}