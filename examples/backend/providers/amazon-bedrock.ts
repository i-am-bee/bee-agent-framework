import "dotenv/config";
import { AmazonBedrockChatModel } from "bee-agent-framework/adapters/amazon-bedrock/backend/chat";
import { UserMessage } from "bee-agent-framework/backend/message";

const llm = new AmazonBedrockChatModel("amazon.titan-text-lite-v1");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
