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

import wiki from "wikipedia";
import { Cache } from "@/cache/decoratorCache.js";
import stringComparison from "string-comparison";
import * as R from "remeda";
import type { Page, pageFunctions, searchOptions } from "wikipedia";
import { ArrayKeys, Common } from "@/internals/types.js";
import {
  SearchToolOptions,
  SearchToolOutput,
  SearchToolResult,
  SearchToolRunOptions,
} from "./base.js";
import { asyncProperties } from "@/internals/helpers/promise.js";
import { z } from "zod";
import { Tool, ToolInput } from "@/tools/base.js";
import Turndown from "turndown";
// @ts-expect-error missing types
import turndownPlugin from "joplin-turndown-plugin-gfm";
import { keys, mapValues } from "remeda";

wiki.default.setLang("en");

export interface SearchOptions extends searchOptions {}

export interface FilterOptions {
  excludeOthersOnExactMatch?: boolean;
  minPageNameSimilarity?: number;
}

export type PageFunctions = Record<
  pageFunctions,
  {
    transform?: <T>(output: T) => T;
  }
> & {
  markdown: {
    transform?: <T>(output: T) => T;
    filter?: (node: HTMLElement) => boolean;
  };
};

export interface ExtractionOptions {
  fields?: Partial<PageFunctions>;
}

export interface OutputOptions {
  maxSerializedLength?: number;
  maxDescriptionLength?: number;
}

export interface WikipediaToolOptions extends SearchToolOptions {
  filters?: FilterOptions;
  search?: SearchOptions;
  extraction?: ExtractionOptions;
  output?: OutputOptions;
}

export interface WikipediaToolRunOptions extends SearchToolRunOptions {
  filters?: FilterOptions;
  search?: SearchOptions;
  extraction?: ExtractionOptions;
  output?: OutputOptions;
}

export interface WikipediaToolResult extends SearchToolResult {
  fields: Partial<Record<keyof PageFunctions, unknown>>;
}

export class WikipediaToolOutput extends SearchToolOutput<WikipediaToolResult> {
  constructor(
    public readonly results: WikipediaToolResult[],
    protected readonly maxSerializedLength: number,
  ) {
    super(results);
  }

  static {
    this.register();
  }

  @Cache()
  getTextContent(): string {
    if (this.isEmpty()) {
      return `No results were found. Try to reformat your query.`;
    }

    const target = this.results.length === 1 ? this.results[0] : this.results;
    const response = JSON.stringify(target);

    return this.maxSerializedLength < Infinity
      ? response.substring(0, this.maxSerializedLength)
      : response;
  }

  createSnapshot() {
    return {
      results: this.results,
      maxSerializedLength: this.maxSerializedLength,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}

export class WikipediaTool extends Tool<
  WikipediaToolOutput,
  WikipediaToolOptions,
  WikipediaToolRunOptions
> {
  name = "Wikipedia";
  description =
    "Search factual and historical information, including biography, history, politics, geography, society, culture, science, technology, people, animal species, mathematics, and other subjects.";

  inputSchema() {
    return z.object({
      query: z
        .string({ description: `Name of the wikipedia page, for example 'New York'` })
        .min(1)
        .max(128),
    });
  }

  public constructor(public readonly config: WikipediaToolOptions = {}) {
    super(config);
  }

  static {
    this.register();
  }

  @Cache()
  protected get _mappers(): Record<
    keyof PageFunctions,
    (page: Page, runOptions: WikipediaToolRunOptions) => Promise<any>
  > {
    return {
      categories: (page) => page.categories(),
      content: (page) => page.content(),
      html: (page) => page.html(),
      markdown: async (page, runOptions) => {
        const html = await page.html().then((result) => {
          const url = new URL(page.fullurl);
          const base = `${url.protocol}//${[url.hostname, url.port].filter(Boolean).join(":")}`;
          return (
            result
              // Missing a protocol
              .replace(/(<img .*src=)"(\/\/.*)"/gm, `$1"${url.protocol}$2"`)
              .replace(/(<a .*href=)"(\/\/.*)"/gm, `$1"${url.protocol}$2"`)

              // Missing a hostname
              .replace(/(<img .*src=)"(\/.*)"/gm, `$1"${base}$2"`)
              .replace(/(<a .*href=)"(\/.*)"/gm, `$1"${base}$2"`)
          );
        });

        const service = new Turndown();
        service.use(turndownPlugin.gfm);
        return service
          .remove((node) => runOptions.extraction?.fields?.markdown?.filter?.(node) === false)
          .turndown(html);
      },
      images: (page) => page.images(),
      intro: (page) => page.intro(),
      infobox: (page) => page.infobox(),
      links: (page) => page.links(),
      coordinates: (page) => page.coordinates(),
      langLinks: (page) => page.langLinks(),
      references: (page) => page.references(),
      related: (page) => page.related(),
      summary: (page) => page.summary(),
      tables: (page) => page.tables(),
    };
  }

  @Cache()
  protected get _defaultRunOptions(): WikipediaToolRunOptions {
    const ignoredTags = new Set([
      "a",
      "img",
      "link",
      "style",
      "abbr",
      "cite",
      "input",
      "sup",
      "bdi",
      "q",
      "figure",
      "audio",
      "track",
      "figcaption",
      "small",
    ]);
    const ignoredTagsSelector = Array.from(ignoredTags.values()).join(",");

    return {
      extraction: {
        fields: {
          markdown: {
            filter: (node) => {
              const tagName = node.tagName.toLowerCase();
              if (ignoredTags.has(tagName)) {
                return false;
              }

              if (ignoredTagsSelector) {
                for (const childNode of node.querySelectorAll(ignoredTagsSelector)) {
                  childNode.remove();
                }
              }

              if (node.children.length === 0) {
                return false;
              }

              return (
                [
                  "toc",
                  "reflist",
                  "mw-references-wrap",
                  "navbox",
                  "navbox-styles",
                  "mw-editsection",
                  "sistersitebox",
                  "navbox-inner",
                  "refbegin",
                  "notpageimage",
                  "mw-file-element",
                ].every((cls) => !node.className.includes(cls)) &&
                ["navigation"].every((role) => node.role !== role)
              );
            },
          },
        },
      },
      filters: {
        minPageNameSimilarity: 0.5,
        excludeOthersOnExactMatch: true,
      },
      search: {
        limit: 3,
        suggestion: true,
      },
      output: {
        maxSerializedLength: 25_000,
        maxDescriptionLength: 250,
      },
    };
  }

  protected _createRunOptions(overrides?: WikipediaToolRunOptions): WikipediaToolRunOptions {
    const baseKeys: ArrayKeys<Common<WikipediaToolRunOptions, WikipediaToolOptions>> = [
      "filters",
      "search",
      "extraction",
      "retryOptions",
      "output",
    ];

    return R.pipe(
      { ...this._defaultRunOptions },
      R.mergeDeep(R.pick(this.options ?? {}, baseKeys)),
      R.mergeDeep({ ...overrides }),
    );
  }

  protected async _run(
    { query: input }: ToolInput<WikipediaTool>,
    _options?: WikipediaToolRunOptions,
  ): Promise<WikipediaToolOutput> {
    const runOptions = this._createRunOptions(_options);

    const { results: searchRawResults, suggestion } = await wiki.default.search(input, {
      suggestion: Boolean(_options?.search?.suggestion),
      ...runOptions.search,
    });

    if (searchRawResults.length === 0 && suggestion && runOptions.search?.suggestion) {
      return await this._run({ query: suggestion }, _options);
    }

    const bestCandidates = stringComparison.jaccardIndex
      .sortMatch(
        input,
        searchRawResults.map((result) => result.title),
      )
      .map((result) => ({
        pageId: searchRawResults[result.index].pageid,
        score: result.rating,
      }))
      .filter((result) => result.score >= (runOptions.filters?.minPageNameSimilarity ?? 0))
      .sort((a, b) => b.score - a.score);

    if (bestCandidates.at(0)?.score === 1 && runOptions.filters?.excludeOthersOnExactMatch) {
      bestCandidates.length = 1;
    }

    const results = await Promise.all(
      bestCandidates.map(async ({ pageId }) => {
        const page = await wiki.default.page(pageId, {
          redirect: true,
          preload: false,
          fields: keys(runOptions.extraction?.fields ?? {}).filter((key) => key !== "markdown"),
        });

        return asyncProperties({
          title: page.title,
          description: ((): Promise<string> => {
            const length = runOptions?.output?.maxDescriptionLength ?? 0;
            return length <= 0
              ? Promise.resolve("")
              : page.content().then((content) => content.substring(0, length));
          })(),
          url: page.fullurl,
          fields: asyncProperties(
            mapValues(runOptions?.extraction?.fields ?? {}, (value, key) =>
              this._mappers[key](page, runOptions)
                .then((response) => (value.transform ? value.transform(response) : response))
                .catch(() => null),
            ),
          ),
        });
      }),
    );
    return new WikipediaToolOutput(results, runOptions.output?.maxSerializedLength ?? Infinity);
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      config: this.config,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    super.loadSnapshot(snapshot);
  }
}
