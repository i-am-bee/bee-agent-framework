import "dotenv/config.js";
import { FrameworkError } from "bee-agent-framework/errors";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { CalculatorTool } from "bee-agent-framework/tools/calculator";
import { GraniteBeeAgent } from "bee-agent-framework/agents/granite/agent";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";

// Ensure that you have added your WatsonX credentials in .env
const llm = WatsonXChatLLM.fromPreset("ibm/granite-3-8b-instruct", {
  apiKey: process.env.WATSONX_API_KEY,
  projectId: process.env.WATSONX_PROJECT_ID,
  region: process.env.WATSONX_REGION, // (optional)
});

const agent = new GraniteBeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new CalculatorTool(), new DuckDuckGoSearchTool({ maxResults: 5 })],
});

// Uncomment the prompt that you want to test
const prompt = `The longest-lived vertebrate is named after an island. What is the current population of that island, rounded to the nearest thousand?`;
// const prompt = `Carl’s favorite food is cheese.
// He ate a sandwich every day this week for lunch and used 2 slices of cheese on each sandwich.
// He ate cheese and egg omelets for breakfast 3 days in the week using one more slice per omelet than he did per sandwich.
// He made a big dish of macaroni and cheese to last him several dinners for the week and used 8 slices of cheese in it.
// How many slices of cheese did he use and how much did it cost? Look up the averge price of a slice of cheese to get the final cost.`
// const prompt = `A candle melts by 2 centimeters every hour that it burns. How many centimeters shorter will a candle be after burning from 1:00 PM to 5:00 PM?`
// const prompt = `Andy plants 90 geraniums and 40 fewer petunias that geraniums. How many flowers does he plant total?`

try {
  console.log(`User 👤 : `, prompt);
  const response = await agent
    .run(
      { prompt },
      {
        execution: {
          maxRetriesPerStep: 3,
          totalMaxRetries: 10,
          maxIterations: 10,
        },
      },
    )
    .observe((emitter) => {
      emitter.on("start", (data) => {
        console.log(`Agent 🤖 : `, "starting new iteration");
      });
      emitter.on("error", ({ error }) => {
        console.log(`Agent 🤖 : `, FrameworkError.ensure(error).dump());
      });
      emitter.on("retry", () => {
        console.log(`Agent 🤖 : `, "retrying the action...");
      });
      emitter.on("update", async ({ data, update, meta }) => {
        // log 'data' to see the whole state
        // to log only valid runs (no errors), check if meta.success === true
        console.log(`Agent (${update.key}) 🤖 : `, update.value.trim());
      });
    });
  console.log(`Agent 🤖 : `, response.result.text);
} catch (error) {
  console.error(FrameworkError.ensure(error).dump());
} finally {
  process.exit(0);
}
