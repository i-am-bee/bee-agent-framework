import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { createConsoleReader } from "examples/helpers/io.js";
import { GraniteBeeAgent } from "bee-agent-framework/agents/granite/agent";
import { IBMVllmChatLLM } from "bee-agent-framework/adapters/ibm-vllm/chat";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";

const llm = IBMVllmChatLLM.fromPreset("ibm/granite-instruct");

const agent = new GraniteBeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new DuckDuckGoSearchTool({ maxResults: 5 }), new OpenMeteoTool()],
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent
      .run(
        { prompt },
        {
          execution: {
            maxRetriesPerStep: 3,
            totalMaxRetries: 10,
            maxIterations: 10,
          },
        },
      )
      .observe((emitter) => {
        emitter.on("start", (data) => {
          reader.write(`Agent 🤖 : `, "starting new iteration");
        });
        emitter.on("error", ({ error }) => {
          reader.write(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
        });
        emitter.on("retry", () => {
          reader.write(`Agent 🤖 : `, "retrying the action...");
        });
        emitter.on("update", async ({ data, update, meta }) => {
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          reader.write(`Agent (${update.key}) 🤖 : `, update.value);
        });
        emitter.on("partialUpdate", ({ data, update, meta }) => {
          // ideal for streaming (line by line)
          // log 'data' to see the whole state
          // to log only valid runs (no errors), check if meta.success === true
          // reader.write(`Agent (partial ${update.key}) 🤖 : `, update.value);
        });
      });

    reader.write(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
