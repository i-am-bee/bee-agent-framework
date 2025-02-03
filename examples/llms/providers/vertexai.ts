import "dotenv/config.js";
import { UserMessage } from "@/backend/message.js";
import { VertexAIChatModel } from "@/adapters/vertexai/backend/chat.js";

const llm = new VertexAIChatModel("gemini-1.5-flash-001");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
