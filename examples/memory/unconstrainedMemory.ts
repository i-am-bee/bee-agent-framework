import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Message } from "@/backend/message.js";

const memory = new UnconstrainedMemory();
await memory.add(
  Message.of({
    role: "user",
    text: `Hello world!`,
  }),
);

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 1
console.log(memory.messages);
