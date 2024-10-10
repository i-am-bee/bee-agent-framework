import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { FrameworkError } from "bee-agent-framework/errors";
import { Logger } from "bee-agent-framework/logger/logger";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { createConsoleReader } from "examples/helpers/io.js";
import { createObserveConnector, ObserveError } from "bee-observe-connector";
import { beeObserveApiSetting } from "examples/helpers/observe.js";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";

Logger.root.level = "silent"; // disable internal logs
const logger = new Logger({ name: "app", level: "trace" });

export const llm = new OllamaChatLLM({
  modelId: "llama3.1",
}); // default is llama3.1 (8B), it is recommended to use 70B model

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new DuckDuckGoSearchTool(), new WikipediaTool(), new OpenMeteoTool()],
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    await agent
      .run(
        { prompt },
        {
          execution: {
            maxRetriesPerStep: 3,
            totalMaxRetries: 10,
            maxIterations: 20,
          },
        },
      )
      .middleware(
        createObserveConnector({
          api: beeObserveApiSetting,
          cb: async (err, data) => {
            if (err) {
              reader.write(`Agent 🤖 : `, ObserveError.ensure(err).explain());
            } else {
              const { id, request, response } = data?.result || {};
              reader.write(`Agent 🤖 : `, response?.text || "Invalid output");

              // you can use `&include_mlflow_tree=true` as well to return all sent data to mlflow
              reader.write(
                `Agent 🤖 : Call the Observe API via this curl command outside of this Interactive session and see the trace data in the "trace.json" file: \n`,
                `curl -X GET "${beeObserveApiSetting.baseUrl}/trace/${id}?include_tree=true&include_mlflow=true" \\
  \t-H "x-bee-authorization: ${beeObserveApiSetting.apiAuthKey}" \\
  \t-H "Content-Type: application/json" \\
  \t-o examples/tmp/observability/trace.json`,
              );
            }
          },
        }),
      );
  }
} catch (error) {
  logger.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
