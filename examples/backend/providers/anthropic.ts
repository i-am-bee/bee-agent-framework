import "dotenv/config";
import { AnthropicChatModel } from "bee-agent-framework/adapters/anthropic/backend/chat";
import { UserMessage } from "bee-agent-framework/backend/message";

const llm = new AnthropicChatModel("claude-3-5-sonnet-latest");

const response = await llm.create({
  messages: [new UserMessage("Hello!")],
});
console.info(response.getTextContent());
