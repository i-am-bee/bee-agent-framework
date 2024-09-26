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

import { customsearch_v1 as GoogleSearchAPI } from "@googleapis/customsearch";
import {
  SearchToolOptions,
  SearchToolOutput,
  SearchToolResult,
  SearchToolRunOptions,
} from "./base.js";
import { Tool, ToolInput, ToolError } from "@/tools/base.js";
import { z } from "zod";
import { Cache } from "@/cache/decoratorCache.js";
import { ValidationError } from "ajv";
import { getEnv } from "@/internals/env.js";

export interface GoogleSearchToolOptions extends SearchToolOptions {
  apiKey?: string;
  cseId?: string;
  maxResultsPerPage?: number;
}

type GoogleSearchToolRunOptions = SearchToolRunOptions;

export interface GoogleSearchToolResult extends SearchToolResult {}

export class GoogleSearchToolOutput extends SearchToolOutput<GoogleSearchToolResult> {
  constructor(public readonly results: GoogleSearchToolResult[]) {
    super(results);
  }

  static {
    this.register();
  }

  createSnapshot() {
    return {
      results: this.results,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export class GoogleSearchTool extends Tool<
  GoogleSearchToolOutput,
  GoogleSearchToolOptions,
  GoogleSearchToolRunOptions
> {
  name = "GoogleCustomSearch";
  description = `Search a query using Google Custom Search Engine.
     Useful for when you need to answer questions or find relevant content on all or specific websites. 
     Output is a list of relevant websites with descriptions.`;

  protected readonly client: GoogleSearchAPI.Customsearch;

  @Cache()
  inputSchema() {
    return z.object({
      query: z.string({ description: `Search query` }).min(1).max(128),
      page: z
        .number()
        .int()
        .min(1)
        .max(10)
        .describe(
          `Search result page (each page contains maximally ${this.options.maxResultsPerPage} results)`,
        )
        .default(1)
        .optional(),
    });
  }

  public constructor(options: GoogleSearchToolOptions) {
    super(options);

    const apiKey = options.apiKey || getEnv("GOOGLE_API_KEY");
    const cseId = options.cseId || getEnv("GOOGLE_CSE_ID");

    if (!apiKey || !cseId) {
      throw new ToolError(
        `"apiKey" or "cseId" must both be provided. Either set them directly or put them in ENV ("GOOGLE_API_KEY" / "GOOGLE_CSE_ID")`,
        [],
        { isFatal: true, isRetryable: false },
      );
    }

    this.options.maxResultsPerPage = options.maxResultsPerPage ?? 10;

    if (this.options.maxResultsPerPage < 1 || this.options.maxResultsPerPage > 10) {
      throw new ValidationError([
        {
          message: "Property range must be between 1 and 10",
          propertyName: "options.maxResultsPerPage",
        },
      ]);
    }

    this.options.apiKey = apiKey;
    this.options.cseId = cseId;
    this.client = this._createClient();
  }

  static {
    this.register();
  }

  protected _createClient() {
    return new GoogleSearchAPI.Customsearch({
      auth: this.options.apiKey,
    });
  }

  protected async _run(
    { query: input, page = 1 }: ToolInput<this>,
    _options?: GoogleSearchToolRunOptions,
  ) {
    const startIndex = (page - 1) * this.options.maxResultsPerPage! + 1;

    const response = await this.client.cse.list({
      cx: this.options.cseId,
      q: input,
      auth: this.options.apiKey,
      num: this.options.maxResultsPerPage,
      start: startIndex,
      safe: "active",
    });

    const results = response.data.items || [];

    return new GoogleSearchToolOutput(
      results.map((result) => ({
        title: result.title || "",
        description: result.snippet || "",
        url: result.link || "",
      })),
    );
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
    Object.assign(this, { client: this._createClient() });
  }
}
