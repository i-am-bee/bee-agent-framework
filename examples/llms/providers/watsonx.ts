import "dotenv/config";
import { BaseMessage } from "@/llms/primitives/message.js";
import { WatsonXChatLLM } from "@/adapters/watsonx/chat.js";

const chatLLM = WatsonXChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct", {
  apiKey: process.env.WATSONX_API_KEY,
  projectId: process.env.WATSONX_PROJECT_ID,
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

console.info("Meta", await chatLLM.meta());

const response = await chatLLM.generate([
  BaseMessage.of({
    role: "user",
    text: "Hello world!",
  }),
]);
console.info(response.messages[0]);
