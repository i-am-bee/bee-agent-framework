import "dotenv/config.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { OpenAIChatLLM } from "bee-agent-framework/adapters/openai/chat";
import { ElasticSearchTool } from "bee-agent-framework/tools/database/elasticsearch";
import { FrameworkError } from "bee-agent-framework/errors";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";

const llm = new OpenAIChatLLM({
  parameters: {
    temperature: 0,
  },
});

const elasticSearchTool = new ElasticSearchTool({
  connection: {
    node: process.env.ELASTICSEARCH_NODE,
    auth: {
      apiKey: process.env.ELASTICSEARCH_API_KEY || "",
    },
  },
});

const agent = new BeeAgent({
  llm,
  memory: new UnconstrainedMemory(),
  tools: [elasticSearchTool],
});

const question = "what is the average ticket price of all flights from Cape Town to Venice";

try {
  const response = await agent
    .run(
      { prompt: `${question}` },
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
