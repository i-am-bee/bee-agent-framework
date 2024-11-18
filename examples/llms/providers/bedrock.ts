import "dotenv/config";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { BedrockChatLLM } from "bee-agent-framework/adapters/bedrock/chat";

const llm = new BedrockChatLLM({
  region: process.env.AWS_REGION,
  modelId: "amazon.titan-text-lite-v1",
  parameters: {
    temperature: 0.7,
    maxTokens: 1024,
    topP: 1,
  },
});

console.info("meta", await llm.meta());
const response = await llm.generate([
  BaseMessage.of({
    role: "user",
    text: "Hello world!",
  }),
]);
console.info(response.getTextContent());
