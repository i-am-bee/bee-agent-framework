import "dotenv/config";
import { UserMessage } from "bee-agent-framework/backend/message";
import { AzureOpenAIChatModel } from "bee-agent-framework/adapters/azure-openai/backend/chat";

const llm = new AzureOpenAIChatModel("gpt-4o-mini");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
