import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { WatsonXLLM } from "bee-agent-framework/adapters/watsonx/llm";

const llm = new WatsonXLLM({
  modelId: "google/flan-ul2",
  projectId: process.env.WATSONX_PROJECT_ID,
  apiKey: process.env.WATSONX_API_KEY,
  region: process.env.WATSONX_REGION, // (optional) default is us-south
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

const reader = createConsoleReader();
const prompt = await reader.prompt();
const response = await llm.generate(prompt);
reader.write(`LLM 🤖 (text) : `, response.getTextContent());
reader.close();
