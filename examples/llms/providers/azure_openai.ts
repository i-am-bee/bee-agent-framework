import "dotenv/config";
import { UserMessage } from "bee-agent-framework/backend/message";
import { AzureChatModel } from "bee-agent-framework/adapters/azure/backend/chat";

const llm = new AzureChatModel("gpt-4o-mini");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
