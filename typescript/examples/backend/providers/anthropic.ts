import "dotenv/config";
import { AnthropicChatModel } from "beeai-framework/adapters/anthropic/backend/chat";
import { UserMessage } from "beeai-framework/backend/message";

const llm = new AnthropicChatModel("claude-3-5-sonnet-latest");

const response = await llm.create({
  messages: [new UserMessage("Hello!")],
});
console.info(response.getTextContent());
