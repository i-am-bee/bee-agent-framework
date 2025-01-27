import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { InferCallbackValue } from "bee-agent-framework/emitter/types";
import { LLMEvents } from "bee-agent-framework/llms/llm";
import fs from "node:fs";
import { Serializer } from "bee-agent-framework/serializer/serializer";

const llm = new OllamaChatLLM({
  modelId: "hf.co/unsloth/DeepSeek-R1-Distill-Qwen-32B-GGUF:Q4_K_M",
});

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new OpenMeteoTool()],
  execution: {
    maxIterations: 3,
    totalMaxRetries: 0,
    maxRetriesPerStep: 0,
  },
});

const response = await agent
  .run({ prompt: "What's the current weather in Las Vegas?" })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });

    const chunks: string[] = [];
    emitter.match(
      (event) => event.creator instanceof OllamaChatLLM && event.name === "start",
      async ({ input }: InferCallbackValue<LLMEvents["start"]>) => {
        await fs.promises.writeFile("/tmp/messages.json", Serializer.serialize(input));
      },
    );
    emitter.match(
      (event) => event.creator instanceof OllamaChatLLM && event.name === "newToken",
      ({ value }: InferCallbackValue<LLMEvents["newToken"]>) => {
        //chunks.push(value.getTextContent());
        //console.clear();
        //console.info(chunks.join(""));
      },
    );
  });

console.log(`Agent 🤖 : `, response.result.text);
