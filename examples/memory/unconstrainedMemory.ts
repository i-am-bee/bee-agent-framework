import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new UnconstrainedMemory();
await memory.add(
  BaseMessage.of({
    role: "user",
    text: `Hello world!`,
  }),
);

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 1
console.log(memory.messages);
