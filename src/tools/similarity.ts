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

import { BaseToolOptions, BaseToolRunOptions, JSONToolOutput, Tool, ToolInput } from "./base.js";
import { string, z } from "zod";
import * as R from "remeda";

const documentSchema = z.object({ text: string() }).passthrough();

type Document = z.infer<typeof documentSchema>;

export interface SimilarityToolOptions<TProviderOptions = unknown> extends BaseToolOptions {
  provider: (
    input: { query: string; documents: Document[] },
    options?: TProviderOptions,
  ) => Promise<{ score: number }[]>;
  maxResults?: number;
}

export interface SimilarityToolRunOptions<TProviderOptions = unknown> extends BaseToolRunOptions {
  provider?: TProviderOptions;
  maxResults?: number;
}

export interface SimilarityToolResult {
  document: Document;
  index: number;
  score: number;
}

export class SimilarityToolOutput extends JSONToolOutput<SimilarityToolResult[]> {}

export class SimilarityTool<TProviderOptions> extends Tool<
  SimilarityToolOutput,
  SimilarityToolOptions<TProviderOptions>,
  SimilarityToolRunOptions<TProviderOptions>
> {
  name = "Similarity";
  description = "Extract relevant information from documents.";

  inputSchema() {
    return z.object({ query: z.string(), documents: z.array(documentSchema) });
  }

  static {
    this.register();
  }

  protected async _run(
    input: ToolInput<this>,
    options?: SimilarityToolRunOptions<TProviderOptions>,
  ) {
    const { query, documents } = input;

    const results = await this.options.provider(
      {
        query,
        documents,
      },
      options?.provider,
    );

    const resultsWithDocumentIndices = results.map(({ score }, idx) => ({
      documentIndex: idx,
      score,
    }));
    const sortedResultsWithDocumentIndices = R.sortBy(resultsWithDocumentIndices, [
      ({ score }) => score,
      "desc",
    ]);
    const filteredResultsWithDocumentIndices = sortedResultsWithDocumentIndices.slice(
      0,
      options?.maxResults ?? this.options.maxResults,
    );

    return new SimilarityToolOutput(
      filteredResultsWithDocumentIndices.map(({ documentIndex, score }) => ({
        document: documents[documentIndex],
        index: documentIndex,
        score,
      })),
    );
  }
}
