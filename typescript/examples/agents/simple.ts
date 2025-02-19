import "dotenv/config.js";
import { BeeAgent } from "beeai-framework/agents/bee/agent";
import { TokenMemory } from "beeai-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "beeai-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";
import { OllamaChatModel } from "beeai-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory(),
  tools: [new DuckDuckGoSearchTool(), new OpenMeteoTool()],
});

const response = await agent
  .run({ prompt: "What's the current weather in Las Vegas?" })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });
  });

console.log(`Agent 🤖 : `, response.result.text);
