import "dotenv/config.js";
import { UserMessage } from "@/backend/message.js";
import { OpenAIChatModel } from "@/adapters/openai/backend/chat.js";

const llm = new OpenAIChatModel("gpt-4o");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
