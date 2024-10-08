import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const llm = new OllamaChatLLM();
const memory = new TokenMemory({
  llm,
  maxTokens: undefined, // optional (default is inferred from the passed LLM instance),
  capacityThreshold: 0.75, // maxTokens*capacityThreshold = threshold where we start removing old messages
  syncThreshold: 0.25, // maxTokens*syncThreshold = threshold where we start to use a real tokenization endpoint instead of guessing the number of tokens
  handlers: {
    // optional way to define which message should be deleted (default is the oldest one)
    removalSelector: (messages) => messages.find((msg) => msg.role !== "system")!,

    // optional way to estimate the number of tokens in a message before we use the actual tokenize endpoint (number of tokens < maxTokens*syncThreshold)
    estimate: (msg) => Math.ceil((msg.role.length + msg.text.length) / 4),
  },
});

await memory.add(BaseMessage.of({ role: "system", text: "You are a helpful assistant." }));
await memory.add(BaseMessage.of({ role: "user", text: "Hello world!" }));

console.info(memory.isDirty); // is the consumed token count estimated or retrieved via the tokenize endpoint?
console.log(memory.tokensUsed); // number of used tokens
console.log(memory.stats()); // prints statistics
await memory.sync(); // calculates real token usage for all messages marked as "dirty"
