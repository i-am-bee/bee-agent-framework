// NOTE: ensure you have installed following packages
// - @langchain/core
// - @langchain/cohere (or any other provider related package that you would like to use)
// List of available providers: https://js.langchain.com/v0.2/docs/integrations/chat/

import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { LangChainChatLLM } from "bee-agent-framework/adapters/langchain/llms/chat";
// @ts-expect-error package not installed
import { ChatCohere } from "@langchain/cohere";

console.info("===CHAT===");
const llm = new LangChainChatLLM(
  new ChatCohere({
    model: "command-r-plus",
    temperature: 0,
  }),
);

const response = await llm.generate([
  BaseMessage.of({
    role: "user",
    text: "Hello world!",
  }),
]);
console.info(response.messages);
console.info(response.getTextContent());
