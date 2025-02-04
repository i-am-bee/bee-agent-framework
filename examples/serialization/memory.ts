import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";
import { Message } from "bee-agent-framework/backend/message";

const llm = new OllamaChatModel("llama3.1");
const memory = new TokenMemory();
await memory.addMany([
  Message.of({
    role: "user",
    text: "What is your name?",
  }),
]);

const serialized = memory.serialize();
const deserialized = TokenMemory.fromSerialized(serialized);

await deserialized.add(
  Message.of({
    role: "assistant",
    text: "Bee",
  }),
);
