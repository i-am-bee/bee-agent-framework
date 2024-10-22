import {
  BaseToolOptions,
  BaseToolRunOptions,
  Tool,
  ToolInput,
  JSONToolOutput,
  ToolError,
} from "bee-agent-framework/tools/base";
import { z } from "zod";
import { createURLParams } from "bee-agent-framework/internals/fetcher";
import { RunContext } from "bee-agent-framework/context";

type ToolOptions = BaseToolOptions & { maxResults?: number };
type ToolRunOptions = BaseToolRunOptions;

export interface OpenLibraryResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  q: string;
  offset: number;
  docs: Record<string, any>[];
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

  protected async _run(
    input: ToolInput<this>,
    _options: ToolRunOptions | undefined,
    run: RunContext<this>,
  ) {
    const query = createURLParams({
      searchon: input,
    });
    const response = await fetch(`https://openlibrary.org?${query}`, {
      signal: run.signal,
    });

    if (!response.ok) {
      throw new ToolError(
        "Request to Open Library API has failed!",
        [new Error(await response.text())],
        {
          context: { input },
        },
      );
    }

    const json: OpenLibraryResponse = await response.json();
    if (this.options.maxResults) {
      json.docs.length = this.options.maxResults;
    }

    return new OpenLibraryToolOutput(json);
  }
}
