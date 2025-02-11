import "dotenv/config.js";
import { UserMessage } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
