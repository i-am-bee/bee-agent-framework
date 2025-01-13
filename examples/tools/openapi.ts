import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { OpenAPITool } from "bee-agent-framework/tools/openapi";
import * as fs from "fs";

const spec = await fs.promises.readFile("./examples/tools/github_schema.json", "utf-8");
const llm = new OllamaChatLLM({
  modelId: "llama3.1", // llama3.1:70b for better performance
});

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new OpenAPITool({ openApiSchema: spec })],
});

const response = await agent
  .run({ prompt: 'How many repositories are in "i-am-bee" org?' })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });
  });

console.log(`Agent 🤖 : `, response.result.text);
