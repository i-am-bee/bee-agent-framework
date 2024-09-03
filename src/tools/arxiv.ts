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
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
  Tool,
  ToolError,
  ToolInput,
  ToolInputValidationError,
} from "@/tools/base.js";
import { z } from "zod";
import { createURLParams } from "@/internals/fetcher.js";
import { Cache } from "@/cache/decoratorCache.js";
import { XMLParser } from "fast-xml-parser";
import { getProp } from "@/internals/helpers/object.js";
import { isDefined, isEmpty, pickBy } from "remeda";
import { castArray } from "@/internals/helpers/array.js";
import { ValueOf } from "@/internals/types.js";
import { AnyToolSchemaLike } from "@/internals/helpers/schema.js";

type ToolOptions = BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

export const SortType = {
  RELEVANCE: "relevance",
  LAST_UPDATED_DATE: "lastUpdatedDate",
  SUBMITTED_DATE: "submittedDate",
} as const;

export const SortOrder = {
  ASCENDING: "ascending",
  DESCENDING: "descending",
} as const;

export const FilterType = {
  ALL: "all",
  TITLE: "title",
  AUTHOR: "author",
  ABSTRACT: "abstract",
  COMMENT: "comment",
  JOURNAL_REFERENCE: "journal_reference",
  SUBJECT_CATEGORY: "subject_category",
  REPORT_NUMBER: "report_number",
} as const;

const FilterTypeMapping: Record<ValueOf<typeof FilterType>, string> = {
  all: "all",
  title: "ti",
  author: "au",
  abstract: "abs",
  comment: "co",
  journal_reference: "jr",
  subject_category: "cat",
  report_number: "rn",
};

export const Separators = {
  AND: "+AND+",
  OR: "+OR+",
  ANDNOT: "+ANDNOT+",
} as const;

export interface ArXivResponse {
  totalResults: number;
  startIndex: number;
  itemsPerPage: number;
  entries: {
    id: string;
    title: string;
    summary: string;
    published: string;
    updated: string;
    authors: { name: string; affiliation: string[] }[];
    doi: string;
    comment: string;
    journalReference: string;
    primaryCategory: string;
    categories: string[];
    links: string[];
  }[];
}

export class ArXivToolOutput extends JSONToolOutput<ArXivResponse> {
  isEmpty(): boolean {
    return !this.result || this.result.totalResults === 0 || this.result.entries.length === 0;
  }
}

const extractId = (value: string) =>
  value.replace("https://arxiv.org/abs/", "").replace("https://arxiv.org/pdf/", "");

export class ArXivTool extends Tool<ArXivToolOutput, ToolOptions, ToolRunOptions> {
  name = "ArXiv";
  description = `Retrieves research articles published on arXiv including related metadata.`;

  @Cache()
  inputSchema() {
    const entrySchema = z.object({
      field: z.nativeEnum(FilterType).default(FilterType.ALL),
      value: z.string().min(1),
    });

    return z.object({
      id_list: z.array(z.string().min(1)).nullish(),
      filters: z
        .array(
          z.object({
            include: z
              .array(entrySchema)
              .nonempty()
              .describe(`Entries are combined as a logical 'AND'`),
            exclude: z
              .array(entrySchema)
              .optional()
              .describe(
                `Entries are combined with those mentioned in 'include' as a logical 'ANDNOT`,
              ),
          }),
        )
        .describe(
          `Entries are combined as a logical 'OR'. Note: filtering by date is not supported.`,
        )
        .nullish()
        .default([]),
      start: z.number().int().min(0).default(0),
      maxResults: z.number().int().min(1).max(100).default(5),
      sort: z
        .object({
          type: z.nativeEnum(SortType).default(SortType.RELEVANCE),
          order: z.nativeEnum(SortOrder).default(SortOrder.DESCENDING),
        })
        .default({
          type: SortType.RELEVANCE,
          order: SortOrder.DESCENDING,
        }),
    });
  }

  static {
    this.register();
  }

  protected validateInput(
    schema: AnyToolSchemaLike,
    rawInput: unknown,
  ): asserts rawInput is ToolInput<this> {
    super.validateInput(schema, rawInput);
    if (isEmpty(rawInput.id_list ?? []) && isEmpty(rawInput.filters ?? [])) {
      throw new ToolInputValidationError(
        `Property 'filters' must be provided and non empty if the 'id_list' property is not provided!`,
      );
    }
  }

  protected _prepareParams(input: ToolInput<typeof this>) {
    return createURLParams({
      start: input.start,
      max_results: input.maxResults,
      sortBy: input.sort.type,
      sortOrder: input.sort.order,
      id_list: isEmpty(input.id_list ?? []) ? undefined : input.id_list?.map(extractId),
      search_query: input.filters
        ?.map(({ include, exclude = [] }) =>
          [
            include
              .map((tag) => `${FilterTypeMapping[tag.field]}:${tag.value}`)
              .join(Separators.AND),
            exclude
              .map((tag) => `${FilterTypeMapping[tag.field]}:${tag.value}`)
              .join(Separators.ANDNOT),
          ]
            .filter(Boolean)
            .join(Separators.ANDNOT),
        )
        .filter(Boolean)
        .join(Separators.OR),
    });
  }

  protected async _run(input: ToolInput<this>, options?: BaseToolRunOptions) {
    const params = this._prepareParams(input);
    const url = `https://export.arxiv.org/api/query?${decodeURIComponent(params.toString())}`;
    const response = await fetch(url, {
      signal: options?.signal,
    });
    const data = await this._parseResponse(response);
    return new ArXivToolOutput(data);
  }

  protected async _parseResponse(response: Response): Promise<ArXivResponse> {
    const parser = new XMLParser({
      allowBooleanAttributes: true,
      alwaysCreateTextNode: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      cdataPropName: "#cdata",
      ignoreAttributes: true,
      numberParseOptions: { hex: false, leadingZeros: true },
      parseAttributeValue: false,
      parseTagValue: true,
      preserveOrder: false,
      removeNSPrefix: true,
      textNodeName: "#text",
      trimValues: true,
      ignoreDeclaration: true,
    });

    const text = await response.text();
    const parsedData = parser.parse(text);

    if (!response.ok) {
      throw new ToolError("Request to ArXiv API has failed!", [
        new Error(JSON.stringify(getProp(parsedData, ["feed", "entry"], parsedData), null, 2)),
      ]);
    }

    let entries: Record<string, any>[] = getProp(parsedData, ["feed", "entry"], []);
    entries = castArray(entries);

    return {
      totalResults: Math.max(getProp(parsedData, ["feed", "totalResults"], 0), entries.length),
      startIndex: getProp(parsedData, ["feed", "startIndex"], 0),
      itemsPerPage: getProp(parsedData, ["feed", "itemsPerPage"], 0),
      entries: entries.map((entry) =>
        pickBy(
          {
            id: extractId(entry.id),
            url: entry.id,
            title: entry.title,
            summary: entry.summary,
            published: entry.published,
            updated: entry.updated,
            authors: castArray(entry.author)
              .filter(Boolean)
              .map((author: any) => ({
                name: author.name,
                affiliation: castArray(author.affiliation ?? []),
              })),
            doi: entry.doi,
            comment: entry.comment,
            journalReference: entry.journal_ref,
            primaryCategory: entry.primary_category,
            categories: castArray(entry.category).filter(Boolean),
            links: castArray(entry.link).filter(Boolean),
          },
          isDefined,
        ),
      ),
    };
  }
}
