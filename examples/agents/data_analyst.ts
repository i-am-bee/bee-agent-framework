import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { BeeSystemPrompt } from "bee-agent-framework/agents/bee/prompts";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { SQLTool } from "bee-agent-framework/tools/database/sql";
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";

const llm = WatsonXChatLLM.fromPreset("meta-llama/llama-3-1-8b-instruct", {
  apiKey: process.env.WATSONX_API_KEY,
  projectId: process.env.WATSONX_PROJECT_ID,
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 1500,
  },
});

const sqlTool = new SQLTool({
  provider: "excel",
  connection: {
    storage: "/Users/eto/Downloads/Trial Balance - 2020-2023.xlsx",
  },
});

// const sqlTool = new SQLTool({
//   provider: "sqlite",
//   examples: [
//     {
//       question: "Get wild albums",
//       query: "SELECT * FROM Album where Title = 'Restless and Wild' LIMIT 1",
//     },
//   ],
//   connection: {
//     dialect: "sqlite",
//     logging: false,
//     storage: await fetch(
//       "https://github.com/lerocha/chinook-database/releases/download/v1.4.5/chinook_sqlite.sqlite",
//     ).then(async (response) => {
//       if (!response.ok) {
//         throw new Error("Failed to download Chinook database!");
//       }

//       const dbPath = path.join(os.tmpdir(), "bee_chinook.sqlite");
//       const data = Buffer.from(await response.arrayBuffer());
//       await fs.promises.writeFile(dbPath, data);
//       return dbPath;
//     }),
//   },
// });

const agent = new BeeAgent({
  llm,
  templates: {
    system: BeeSystemPrompt.fork((old) => ({
      ...old,
      defaults: {
        instructions:
          "You are the Bee 🐝 Data Agent! If the user asks about data questions, use the FlowPilot tool, passing the user natural language question as 'question' to the tool. Do not render ascii tables, the user will already see it externally.",
      },
    })),
  },

  memory: new TokenMemory({ llm }),
  tools: [sqlTool],
});

const reader = createConsoleReader();

try {
  for await (const { prompt } of reader) {
    const response = await agent
      .run(
        { prompt },
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
          if (update.key === "tool_output" && update.value.includes('"results":')) {
            const results = JSON.parse(update.value).results;
            console.table(results);
          } else {
            console.log(`Agent (${update.key}) 🤖 : `, update.value);
          }
        });
      });

    console.log(`Agent 🤖 : `, response.result.text);
  }
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  await sqlTool.destroy();
}
