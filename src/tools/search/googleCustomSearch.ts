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
import { Tool, ToolInput } from "@/tools/base.js";
import { z } from "zod";
import { Cache } from "@/cache/decoratorCache.js";
import { ValueError } from "@/errors.js";
import { ValidationError } from "ajv";
import { parseEnv } from "@/internals/env.js";

export interface GoogleSearchToolOptions extends SearchToolOptions {
  apiKey?: string;
  cseId?: string;
  maxResultsPerPage: number;
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

  @Cache()
  inputSchema() {
    return z.object({
      query: z.string({ description: `Search query` }).min(1).max(2048),
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

  protected apiKey: string;
  protected cseId: string;

  public constructor(options: GoogleSearchToolOptions = { maxResultsPerPage: 10 }) {
    super(options);

    this.apiKey = options.apiKey || parseEnv("GOOGLE_API_KEY", z.string());
    this.cseId = options.cseId || parseEnv("GOOGLE_CSE_ID", z.string());

    if (!this.apiKey || !this.cseId) {
      throw new ValueError(
        [
          `"apiKey" or "cseId" must both be provided.`,
          `Either set them directly or put them in ENV ("WATSONX_ACCESS_TOKEN" / "WATSONX_API_KEY")`,
        ].join("\n"),
      );
    }

    if (options.maxResultsPerPage < 1 || options.maxResultsPerPage > 10) {
      throw new ValidationError([
        {
          message: "Property range must be between 1 and 10",
          propertyName: "options.maxResultsPerPage",
        },
      ]);
    }
  }

  @Cache()
  protected get client(): GoogleSearchAPI.Customsearch {
    return new GoogleSearchAPI.Customsearch({
      auth: this.apiKey,
    });
  }

  static {
    this.register();
  }

  protected async _run(
    { query: input, page = 1 }: ToolInput<this>,
    options?: GoogleSearchToolRunOptions,
  ) {
    const startIndex = (page - 1) * this.options.maxResultsPerPage + 1;
    const response = await this.client.cse.list(
      {
        cx: this.cseId,
        q: input,
        num: this.options.maxResultsPerPage,
        start: startIndex,
        safe: "active",
      },
      {
        signal: options?.signal,
      },
    );

    const results = response.data.items || [];

    return new GoogleSearchToolOutput(
      results.map((result) => ({
        title: result.title || "",
        description: result.snippet || "",
        url: result.link || "",
      })),
    );
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      apiKey: this.apiKey,
      cseId: this.cseId,
    };
  }

  loadSnapshot({ apiKey, cseId, ...snapshot }: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(snapshot);
    Object.assign(this, {
      apiKey,
      cseId,
    });
  }
}
