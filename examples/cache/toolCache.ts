import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { SlidingCache } from "bee-agent-framework/cache/slidingCache";

const ddg = new DuckDuckGoSearchTool({
  cache: new SlidingCache({
    size: 100, // max 100 entries
    ttl: 5 * 60 * 1000, // 5 minutes lifespan
  }),
});

const response = await ddg.run({
  query: "the time of the fastest marathon run",
  page: 1,
});
// upcoming requests with the EXACTLY same input will be retrieved from the cache
