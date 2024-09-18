import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { GroqChatLLM } from "bee-agent-framework/adapters/groq/chat";
import { SQLTool } from "bee-agent-framework/tools/database/sql";
import { FrameworkError } from "bee-agent-framework/errors";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";

const llm = new GroqChatLLM({
  modelId: "llama3-70b-8192",
  parameters: {
    temperature: 0,
    max_tokens: 8192,
  },
});

const sqlTool = new SQLTool({
  provider: "sqlite",
});

const agent = new BeeAgent({
  llm,
  memory: new UnconstrainedMemory(),
  tools: [sqlTool],
});

const question = "which country's customers spent the most?";

try {
  const response = await agent
    .run(
      { prompt: "From the database: " + question },
      {
        execution: {
          maxRetriesPerStep: 5,
          totalMaxRetries: 10,
          maxIterations: 15,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("error", ({ error }) => {
        console.log(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
      });
      emitter.on("retry", () => {
        console.log(`Agent 🤖 : `, "retrying the action...");
      });
      emitter.on("update", async ({ data, update, meta }) => {
        console.log(`Agent (${update.key}) 🤖 : `, update.value);
      });
    });

  console.log(`Agent 🤖 : `, response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
