import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { WatsonXLLM } from "@/adapters/watsonx/llm.js";

const llm = new WatsonXLLM({
  modelId: "google/flan-ul2",
  projectId: process.env.WATSONX_PROJECT_ID,
  apiKey: process.env.WATSONX_API_KEY,
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

const reader = createConsoleReader();

const prompt = await reader.prompt();
const response = await llm.generate(prompt);
reader.write(`LLM 🤖 (text) : `, response.getTextContent());
process.exit(0);
