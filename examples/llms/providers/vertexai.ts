import "dotenv/config.js";
import { UserMessage } from "bee-agent-framework/backend/message";
import { VertexAIChatModel } from "bee-agent-framework/adapters/vertexai/backend/chat";

const llm = new VertexAIChatModel("gemini-1.5-flash-001");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
