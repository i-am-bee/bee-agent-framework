import "dotenv/config.js";
import { UserMessage } from "@/backend/message.js";
import { WatsonXChatModel } from "@/adapters/watsonx/backend/chat.js";

const llm = new WatsonXChatModel("meta-llama/llama-3-1-70b-instruct");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
