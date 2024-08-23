import "dotenv/config.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import { TokenMemory } from "@/memory/tokenMemory.js";
import { DuckDuckGoSearchTool } from "@/tools/search/duckDuckGoSearch.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { OpenMeteoTool } from "@/tools/weather/openMeteo.js";

const llm = new OllamaChatLLM();
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
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
