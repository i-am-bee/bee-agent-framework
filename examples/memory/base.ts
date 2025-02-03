import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Message } from "@/backend/message.js";

const memory = new UnconstrainedMemory();

// Single message
await memory.add(
  Message.of({
    role: "system",
    text: `You are a helpful assistant.`,
  }),
);

// Multiple messages
await memory.addMany([
  Message.of({ role: "user", text: `What can you do?` }),
  Message.of({ role: "assistant", text: `Everything!` }),
]);

console.info(memory.isEmpty()); // false
console.info(memory.messages); // prints all saved messages
console.info(memory.asReadOnly()); // returns a NEW read only instance
memory.reset(); // removes all messages
