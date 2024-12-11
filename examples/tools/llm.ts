import "dotenv/config";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { createConsoleReader } from "examples/helpers/io.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { LLMTool } from "bee-agent-framework/tools/llm";

const agent = new BeeAgent({
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
  memory: new UnconstrainedMemory(),
  tools: [
    new LLMTool({
      llm: BAMChatLLM.fromPreset("meta-llama/llama-3-8b-instruct"),
    }),
    new WikipediaTool(),
  ],
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent
      .run({
        prompt,
      })
      .observe((emitter) => {
        emitter.on("retry", () => {
          reader.write(`Agent 🤖 : `, "retrying the action...");
        });
        emitter.on("update", async ({ update }) => {
          reader.write(`Agent (${update.key}) 🤖 : `, `${update.value}`);
        });
      });

    reader.write(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  reader.write("ERROR", FrameworkError.ensure(error).dump());
}
