import "dotenv/config.js";
import { UserMessage } from "@/backend/message.js";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

const llm = new OllamaChatModel("llama3.1");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
