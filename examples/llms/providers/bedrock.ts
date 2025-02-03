import "dotenv/config";
import { BedrockChatModel } from "bee-agent-framework/adapters/bedrock/backend/chat";
import { UserMessage } from "bee-agent-framework/backend/message";

const llm = new BedrockChatModel("amazon.titan-text-lite-v1");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
