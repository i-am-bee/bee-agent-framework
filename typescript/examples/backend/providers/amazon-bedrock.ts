import "dotenv/config";
import { AmazonBedrockChatModel } from "beeai-framework/adapters/amazon-bedrock/backend/chat";
import { UserMessage } from "beeai-framework/backend/message";

const llm = new AmazonBedrockChatModel("amazon.titan-text-lite-v1");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
