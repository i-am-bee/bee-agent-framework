import "dotenv/config.js";
import { UserMessage } from "bee-agent-framework/backend/message";
import { WatsonXChatModel } from "bee-agent-framework/adapters/watsonx/backend/chat";

const llm = new WatsonXChatModel("meta-llama/llama-3-1-70b-instruct");

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
