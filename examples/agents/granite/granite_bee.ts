import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import * as process from "node:process";
import { createConsoleReader } from "examples/helpers/io.js";
import { ChatModel } from "bee-agent-framework/backend/chat";

const llm = await ChatModel.fromName("ollama:granite3.1-dense:8b");
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory(),
  tools: [new OpenMeteoTool(), new DuckDuckGoSearchTool({ maxResults: 3 })],
});

const reader = createConsoleReader();

try {
  const prompt = await reader.prompt();
  const response = await agent
    .run(
      { prompt },
      {
        execution: {
          maxIterations: 8,
          maxRetriesPerStep: 3,
          totalMaxRetries: 3,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("update", (data) => {
        reader.write(`Agent (${data.update.key}) 🤖 : `, data.update.value.trim());
      });
    });
  reader.write(`Agent 🤖: `, response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
