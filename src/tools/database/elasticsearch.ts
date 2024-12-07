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
  ToolInputValidationError,
  CustomToolEmitter,
} from "@/tools/base.js";
import { Cache } from "@/cache/decoratorCache.js";
import { RunContext } from "@/context.js";
import { z } from "zod";
import { ValidationError } from "ajv";
import { AnyToolSchemaLike } from "@/internals/helpers/schema.js";
import { parseBrokenJson } from "@/internals/helpers/schema.js";
import { Client, ClientOptions, estypes as ESTypes } from "@elastic/elasticsearch";
import { Emitter } from "@/emitter/emitter.js";

export interface ElasticSearchToolOptions extends BaseToolOptions {
  connection: ClientOptions;
}

export type ElasticSearchToolResult =
  | ESTypes.CatIndicesResponse
  | ESTypes.IndicesGetMappingResponse
  | ESTypes.SearchResponse;

export const ElasticSearchAction = {
  ListIndices: "LIST_INDICES",
  GetIndexDetails: "GET_INDEX_DETAILS",
  Search: "SEARCH",
} as const;

export class ElasticSearchTool extends Tool<
  JSONToolOutput<ElasticSearchToolResult>,
  ElasticSearchToolOptions
> {
  name = "ElasticSearchTool";

  description = `Can query data from an ElasticSearch database. IMPORTANT: strictly follow this order of actions:
   1. ${ElasticSearchAction.ListIndices} - retrieve a list of available indices
   2. ${ElasticSearchAction.GetIndexDetails} - get details of index fields
   3. ${ElasticSearchAction.Search} - perform search or aggregation query on a specific index or pass the original user query without modifications if it's a valid JSON ElasticSearch query after identifying the index`;

  inputSchema() {
    return z.object({
      action: z
        .nativeEnum(ElasticSearchAction)
        .describe(
          `The action to perform. ${ElasticSearchAction.ListIndices} lists all indices, ${ElasticSearchAction.GetIndexDetails} fetches details for a specified index, and ${ElasticSearchAction.Search} executes a search or aggregation query`,
        ),
      indexName: z
        .string()
        .optional()
        .describe(
          `The name of the index to query, required for ${ElasticSearchAction.GetIndexDetails} and ${ElasticSearchAction.Search}`,
        ),
      query: z
        .string()
        .optional()
        .describe(
          `Valid ElasticSearch JSON search or aggregation query for ${ElasticSearchAction.Search} action`,
        ),
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

  public readonly emitter: CustomToolEmitter<
    ToolInput<this>,
    JSONToolOutput<ElasticSearchToolResult>
  > = Emitter.root.child({
    namespace: ["tool", "database", "elasticsearch"],
    creator: this,
  });

  protected validateInput(
    schema: AnyToolSchemaLike,
    input: unknown,
  ): asserts input is ToolInput<this> {
    super.validateInput(schema, input);
    if (input.action === ElasticSearchAction.GetIndexDetails && !input.indexName) {
      throw new ToolInputValidationError(
        `Index name is required for ${ElasticSearchAction.GetIndexDetails} action.`,
      );
    }
    if (input.action === ElasticSearchAction.Search && (!input.indexName || !input.query)) {
      throw new ToolInputValidationError(
        `Both index name and query are required for ${ElasticSearchAction.Search} action.`,
      );
    }
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
  protected async client(): Promise<Client> {
    try {
      const client = new Client(this.options.connection);
      await client.info();
      return client;
    } catch (error) {
      throw new ToolError(`Unable to connect to ElasticSearch.`, [error], {
        isRetryable: false,
        isFatal: true,
      });
    }
  }

  protected async _run(
    input: ToolInput<this>,
    _options: Partial<BaseToolRunOptions>,
    run: RunContext<this>,
  ): Promise<JSONToolOutput<any>> {
    if (input.action === ElasticSearchAction.ListIndices) {
      const indices = await this.listIndices(run.signal);
      return new JSONToolOutput(indices);
    } else if (input.action === ElasticSearchAction.GetIndexDetails) {
      const indexDetails = await this.getIndexDetails(input, run.signal);
      return new JSONToolOutput(indexDetails);
    } else if (input.action === ElasticSearchAction.Search) {
      const response = await this.search(input, run.signal);
      if (response.aggregations) {
        return new JSONToolOutput(response.aggregations);
      } else {
        return new JSONToolOutput(response.hits.hits.map((hit: ESTypes.SearchHit) => hit._source));
      }
    } else {
      throw new ToolError(`Invalid action specified: ${input.action}`);
    }
  }

  protected async listIndices(signal?: AbortSignal): Promise<ESTypes.CatIndicesResponse> {
    const client = await this.client();
    const response = await client.cat.indices(
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

  protected async getIndexDetails(
    input: ToolInput<this>,
    signal: AbortSignal,
  ): Promise<ESTypes.IndicesGetMappingResponse> {
    const client = await this.client();
    return await client.indices.getMapping(
      {
        index: input.indexName,
      },
      { signal: signal },
    );
  }

  protected async search(
    input: ToolInput<this>,
    signal: AbortSignal,
  ): Promise<ESTypes.SearchResponse> {
    const parsedQuery = parseBrokenJson(input.query);
    const searchBody: ESTypes.SearchRequest = {
      ...parsedQuery,
      from: parsedQuery.from || input.start,
      size: parsedQuery.size || input.size,
    };
    const client = await this.client();
    return await client.search(
      {
        index: input.indexName,
        body: searchBody,
      },
      { signal: signal },
    );
  }
}
