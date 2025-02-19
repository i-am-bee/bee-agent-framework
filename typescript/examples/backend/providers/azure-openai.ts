import "dotenv/config";
import { UserMessage } from "beeai-framework/backend/message";
import { AzureOpenAIChatModel } from "beeai-framework/adapters/azure-openai/backend/chat";

const llm = new AzureOpenAIChatModel("gpt-4o-mini");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
