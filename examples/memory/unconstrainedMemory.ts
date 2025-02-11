import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Message } from "bee-agent-framework/backend/message";

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
