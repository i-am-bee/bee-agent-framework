import "dotenv/config";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { WatsonXChatLLM } from "bee-agent-framework/adapters/watsonx/chat";

const chatLLM = WatsonXChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct", {
  apiKey: process.env.WATSONX_API_KEY,
  projectId: process.env.WATSONX_PROJECT_ID,
  region: process.env.WATSONX_REGION, // (optional) default is us-south
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
