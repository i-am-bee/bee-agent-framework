import {
  BaseToolOptions,
  BaseToolRunOptions,
  Tool,
  ToolInput,
  JSONToolOutput,
  ToolError,
} from "@/tools/base.js";
import { z } from "zod";
import { createURLParams } from "@/internals/fetcher.js";

type ToolOptions = BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

export interface OpenLibraryResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  num_found: number;
  q: string;
  offset: number;
  docs: {
    _version_: number;
    key: string;
    title: string;
    subtitle: string;
    alternative_title: string;
    alternative_subtitle: string;
    cover_i: number;
    ebook_access: string;
    ebook_count_i: number;
    edition_count: number;
    edition_key: string[];
    format: string[];
    publish_date: string[];
    lccn: string[];
    ia: string[];
    oclc: string[];
    public_scan_b: boolean;
    isbn: string[];
    contributor: string[];
    publish_place: string[];
    publisher: string[];
    seed: string[];
    first_sentence: string[];
    author_key: string[];
    author_name: string[];
    author_alternative_name: string[];
    subject: string[];
    person: string[];
    place: string[];
    time: string[];
    has_fulltext: boolean;
    title_suggest: string;
    title_sort: string;
    type: string;
    publish_year: number[];
    language: string[];
    last_modified_i: number;
    number_of_pages_median: number;
    place_facet: string[];
    publisher_facet: string[];
    author_facet: string[];
    first_publish_year: number;
    ratings_count_1: number;
    ratings_count_2: number;
    ratings_count_3: number;
    ratings_count_4: number;
    ratings_count_5: number;
    ratings_average: number;
    ratings_sortable: number;
    ratings_count: number;
    readinglog_count: number;
    want_to_read_count: number;
    currently_reading_count: number;
    already_read_count: number;
    subject_key: string[];
    person_key: string[];
    place_key: string[];
    subject_facet: string[];
    time_key: string[];
    lcc: string[];
    ddc: string[];
    lcc_sort: string;
    ddc_sort: string;
  }[];
}

export class OpenLibraryToolOutput extends JSONToolOutput<OpenLibraryResponse> {
  isEmpty(): boolean {
    return !this.result || this.result.numFound === 0 || this.result.docs.length === 0;
  }
}

export class OpenLibraryTool extends Tool<OpenLibraryToolOutput, ToolOptions, ToolRunOptions> {
  name = "OpenLibrary";
  description =
    "Provides access to a library of books with information about book titles, authors, contributors, publication dates, publisher and isbn.";

  inputSchema() {
    return z
      .object({
        title: z.string(),
        author: z.string(),
        isbn: z.string(),
        subject: z.string(),
        place: z.string(),
        person: z.string(),
        publisher: z.string(),
      })
      .partial();
  }

  static {
    this.register();
  }

  protected async _run(input: ToolInput<this>, options?: ToolRunOptions) {
    const params = createURLParams(input);
    const url = `https://openlibrary.org/search.json?${decodeURIComponent(params.toString())}`;
    const response = await fetch(url, {
      signal: options?.signal,
    });
    if (!response.ok) {
      throw new ToolError("Request to Open Library API has failed!", [
        new Error(await response.text()),
      ]);
    }
    try {
      const json = await response.json();
      return new OpenLibraryToolOutput(json);
    } catch (e) {
      throw new ToolError("Request to Open Library has failed to parse!", [e]);
    }
  }
}
