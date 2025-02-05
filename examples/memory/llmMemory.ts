import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Message } from "@/backend/message.js";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

const memory = new UnconstrainedMemory();
await memory.addMany([
  Message.of({
    role: "system",
    text: `Always respond very concisely.`,
  }),
  Message.of({ role: "user", text: `Give me first 5 prime numbers.` }),
]);

// Generate response
const llm = new OllamaChatModel("llama3.1");
const response = await llm.create({ messages: memory.messages });
await memory.add(Message.of({ role: "assistant", text: response.getTextContent() }));

console.log(`Conversation history`);
for (const message of memory) {
  console.log(`${message.role}: ${message.text}`);
}
