import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { BeeSystemPrompt } from "bee-agent-framework/agents/bee/prompts";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";

const llm = new OllamaChatLLM();
const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new OpenMeteoTool()],
  templates: {
    system: BeeSystemPrompt.fork((old) => ({
      ...old,
      defaults: {
        instructions:
          "You are a helpful assistant that uses tools to answer weather-related questions.",
      },
    })),
  },
});

const response = await agent
  .run({ prompt: "What's the current weather in Las Vegas?" })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });
  });

console.log(`Agent 🤖 : `, response.result.text);
