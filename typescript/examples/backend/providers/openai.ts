import "dotenv/config.js";
import { UserMessage } from "beeai-framework/backend/message";
import { OpenAIChatModel } from "beeai-framework/adapters/openai/backend/chat";

const llm = new OpenAIChatModel("gpt-4o");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
