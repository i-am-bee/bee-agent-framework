import { Message } from "@/backend/message.js";
import { SummarizeMemory } from "bee-agent-framework/memory/summarizeMemory";
import { OllamaChatModel } from "@/adapters/ollama/backend/chat.js";

const memory = new SummarizeMemory({
  llm: new OllamaChatModel("llama3.1"),
});

await memory.addMany([
  Message.of({ role: "system", text: "You are a guide through France." }),
  Message.of({ role: "user", text: "What is the capital?" }),
  Message.of({ role: "assistant", text: "Paris" }),
  Message.of({ role: "user", text: "What language is spoken there?" }),
]);

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 1
console.log(memory.messages[0].text); // The capital city of France is Paris, ...
