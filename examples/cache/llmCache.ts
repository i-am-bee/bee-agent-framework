import { SlidingCache } from "bee-agent-framework/cache/slidingCache";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const llm = new OllamaChatLLM({
  modelId: "llama3.1",
  parameters: {
    temperature: 0,
    num_predict: 50,
  },
  cache: new SlidingCache({
    size: 50,
  }),
});

console.info(await llm.cache.size()); // 0
const first = await llm.generate([BaseMessage.of({ role: "user", text: "Who was Alan Turing?" })]);
// upcoming requests with the EXACTLY same input will be retrieved from the cache
console.info(await llm.cache.size()); // 1
const second = await llm.generate([BaseMessage.of({ role: "user", text: "Who was Alan Turing?" })]);
console.info(first === second); // true
