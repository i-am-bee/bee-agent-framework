import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";

import { createConsoleReader } from "examples/helpers/io.js";
import { GraniteBeeAgent } from "bee-agent-framework/agents/granite/agent";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";
import { z } from "zod";
import { parseEnv } from "bee-agent-framework/internals/env";

// Ensure that you have added your WatsonX credentials in .env
const llm = WatsonXChatLLM.fromPreset("ibm/granite-3-8b-instruct", {
  apiKey: parseEnv("WATSONX_API_KEY", z.string()),
  projectId: parseEnv("WATSONX_PROJECT_ID", z.string()),
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 1024,
  },
});

const agent = new GraniteBeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new DuckDuckGoSearchTool({ maxResults: 3 })],
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
