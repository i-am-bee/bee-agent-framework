import "dotenv/config";
import { GroqChatModel } from "beeai-framework/adapters/groq/backend/chat";
import { UserMessage } from "beeai-framework/backend/message";

const llm = new GroqChatModel("gemma2-9b-it");

const response = await llm.create({
  messages: [new UserMessage("Hello!")],
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
});
console.info(response.getTextContent());
