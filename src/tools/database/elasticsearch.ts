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
import { z } from "zod";
import { Client, ClientOptions } from "@elastic/elasticsearch";
import {
  CatIndicesResponse,
  IndicesGetMappingResponse,
  SearchRequest,
  SearchResponse,
  SearchHit,
} from "@elastic/elasticsearch/lib/api/types.js";
import { ValidationError } from "ajv";

type ToolRunOptions = BaseToolRunOptions;

export interface ElasticSearchToolOptions extends BaseToolOptions {
  connection: ClientOptions;
}

export class ElasticSearchTool extends Tool<
  JSONToolOutput<any>,
  ElasticSearchToolOptions,
  ToolRunOptions
> {
  name = "ElasticSearchTool";

  description = `Can query data from an ElasticSearch database. IMPORTANT: strictly follow this order of actions:
   1. LIST_INDICES - retrieve a list of available indices
   2. GET_INDEX_DETAILS - get details of index fields
   3. SEARCH - perform search or aggregation query on a specific index or pass the original user query without modifications if it's a valid JSON ElasticSearch query`;

  inputSchema() {
    return z.object({
      action: z
        .enum(["LIST_INDICES", "GET_INDEX_DETAILS", "SEARCH"])
        .describe(
          "The action to perform. LIST_INDICES lists all indices, GET_INDEX_DETAILS fetches details for a specified index, and SEARCH executes a search or aggregation query",
        ),
      indexName: z
        .string()
        .optional()
        .describe("The name of the index to query, required for GET_INDEX_DETAILS and SEARCH"),
      query: z
        .string()
        .optional()
        .describe("Valid ElasticSearch JSON search or aggregation query for SEARCH action"),
      start: z.coerce
        .number()
        .int()
        .min(0)
        .default(0)
        .optional()
        .describe(
          "The record index from which the query will start. Increase by the size of the query to get the next page of results",
        ),
      size: z.coerce
        .number()
        .int()
        .min(0)
        .max(10)
        .default(10)
        .optional()
        .describe("How many records will be retrieved from the ElasticSearch query. Maximum is 10"),
    });
  }

  static {
    this.register();
  }

  public constructor(options: ElasticSearchToolOptions) {
    super(options);
    if (!options.connection.cloud && !options.connection.node && !options.connection.nodes) {
      throw new ValidationError([
        {
          message: "At least one of the properties must be provided",
          propertyName: "connection.cloud, connection.node, connection.nodes",
        },
      ]);
    }
  }

  @Cache()
  protected get client(): Client {
    try {
      return new Client(this.options.connection);
    } catch (error) {
      throw new ToolError(`Unable to connect to ElasticSearch: ${error}`, [], {
        isRetryable: false,
        isFatal: true,
      });
    }
  }

  protected async _run(
    input: ToolInput<this>,
    _options?: ToolRunOptions,
  ): Promise<JSONToolOutput<any>> {
    if (input.action === "LIST_INDICES") {
      const indices = await this.listIndices(_options?.signal);
      return new JSONToolOutput(indices);
    } else if (input.action === "GET_INDEX_DETAILS") {
      const indexDetails = await this.getIndexDetails(input, _options?.signal);
      return new JSONToolOutput(indexDetails);
    } else if (input.action === "SEARCH") {
      const response = await this.search(input, _options?.signal);
      if (response.aggregations) {
        return new JSONToolOutput(response.aggregations);
      } else {
        return new JSONToolOutput(response.hits.hits.map((hit: SearchHit) => hit._source));
      }
    } else {
      throw new ToolError("Invalid action specified.");
    }
  }

  private async listIndices(signal?: AbortSignal): Promise<CatIndicesResponse> {
    const response = await this.client.cat.indices(
      {
        expand_wildcards: "open",
        h: "index",
        format: "json",
      },
      { signal: signal },
    );
    return response
      .filter((record) => record.index && !record.index.startsWith(".")) // Exclude system indices
      .map((record) => ({ index: record.index }));
  }

  private async getIndexDetails(
    input: ToolInput<this>,
    signal?: AbortSignal,
  ): Promise<IndicesGetMappingResponse> {
    if (!input.indexName) {
      throw new ToolError("Index name is required for GET_INDEX_DETAILS action.");
    }
    return await this.client.indices.getMapping(
      {
        index: input.indexName,
      },
      { signal: signal },
    );
  }

  private async search(input: ToolInput<this>, signal?: AbortSignal): Promise<SearchResponse> {
    if (!input.indexName || !input.query) {
      throw new ToolError("Both index name and query are required for SEARCH action.");
    }
    let parsedQuery;
    try {
      parsedQuery = JSON.parse(input.query);
    } catch {
      throw new ToolError(`Invalid JSON format for query`);
    }

    if (!parsedQuery.query && !parsedQuery.aggs) {
      throw new ToolError("Search body must contain either a 'query' field or an 'aggs' field.");
    }

    const searchBody: SearchRequest = {
      ...parsedQuery,
      from: parsedQuery.from || input.start,
      size: parsedQuery.size || input.size,
    };

    return await this.client.search(
      {
        index: input.indexName,
        body: searchBody,
      },
      { signal: signal },
    );
  }

  loadSnapshot({ ...snapshot }: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
  }
}
