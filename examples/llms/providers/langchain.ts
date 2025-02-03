// NOTE: ensure you have installed following packages
// - @langchain/core
// - @langchain/cohere (or any other provider related package that you would like to use)
// List of available providers: https://js.langchain.com/v0.2/docs/integrations/chat/

import { UserMessage } from "@/backend/message.js";
import { LangChainChatModel } from "bee-agent-framework/adapters/langchain/backend/chat";
// @ts-expect-error package not installed
import { ChatCohere } from "@langchain/cohere";

console.info("===CHAT===");
const llm = new LangChainChatModel(
  new ChatCohere({
    model: "command-r-plus",
    temperature: 0,
  }),
);

const response = await llm.create({
  messages: [new UserMessage("Hello world!")],
});
console.info(response.getTextContent());
