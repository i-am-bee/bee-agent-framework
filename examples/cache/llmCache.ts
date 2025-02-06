import { SlidingCache } from "bee-agent-framework/cache/slidingCache";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";
import { UserMessage } from "bee-agent-framework/backend/message";

const llm = new OllamaChatModel("llama3.1");
llm.config({
  cache: new SlidingCache({
    size: 50,
  }),
  parameters: {
    maxTokens: 25,
  },
});

console.info(await llm.cache.size()); // 0
const first = await llm.create({
  messages: [new UserMessage("Who was Alan Turing?")],
});
// upcoming requests with the EXACTLY same input will be retrieved from the cache
console.info(await llm.cache.size()); // 1
const second = await llm.create({
  messages: [new UserMessage("Who was Alan Turing?")],
});
console.info(first.getTextContent() === second.getTextContent()); // true
console.info(await llm.cache.size()); // 1
