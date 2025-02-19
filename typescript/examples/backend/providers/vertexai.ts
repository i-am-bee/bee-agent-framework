import "dotenv/config.js";
import { UserMessage } from "beeai-framework/backend/message";
import { GoogleVertexChatModel } from "beeai-framework/adapters/google-vertex/backend/chat";

const llm = new GoogleVertexChatModel("gemini-1.5-flash-001");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
