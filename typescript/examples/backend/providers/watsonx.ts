import "dotenv/config.js";
import { UserMessage } from "beeai-framework/backend/message";
import { WatsonxChatModel } from "beeai-framework/adapters/watsonx/backend/chat";

const llm = new WatsonxChatModel("meta-llama/llama-3-1-70b-instruct");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
