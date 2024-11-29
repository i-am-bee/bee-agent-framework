import { z } from "zod";
import {
  DuckDuckGoSearchTool,
  DuckDuckGoSearchToolSearchType as SafeSearchType,
} from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { setProp } from "bee-agent-framework/internals/helpers/object";

const searchTool = new DuckDuckGoSearchTool();

const customSearchTool = searchTool.extend(
  z.object({
    query: z.string(),
    safeSearch: z.boolean().default(true),
  }),
  (input, options) => {
    setProp(
      options,
      ["search", "safeSearch"],
      input.safeSearch ? SafeSearchType.STRICT : SafeSearchType.OFF,
    );
    return { query: input.query };
  },
);

const response = await customSearchTool.run(
  {
    query: "News in the world!",
    safeSearch: true,
  },
  {
    signal: AbortSignal.timeout(10_000),
  },
);
console.info(response);
