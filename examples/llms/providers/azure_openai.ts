import "dotenv/config";
import { UserMessage } from "@/backend/message.js";
import { AzureChatModel } from "@/adapters/azure/backend/chat.js";

const llm = new AzureChatModel("gpt-4o-mini");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
