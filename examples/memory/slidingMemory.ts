import { SlidingMemory } from "bee-agent-framework/memory/slidingMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new SlidingMemory({
  size: 3, // (required) number of messages that can be in the memory at a single moment
  handlers: {
    // optional
    // we select a first non-system message (default behaviour is to select the oldest one)
    removalSelector: (messages) => messages.find((msg) => msg.role !== "system")!,
  },
});

await memory.add(BaseMessage.of({ role: "system", text: "You are a guide through France." }));
await memory.add(BaseMessage.of({ role: "user", text: "What is the capital?" }));
await memory.add(BaseMessage.of({ role: "assistant", text: "Paris" }));
await memory.add(BaseMessage.of({ role: "user", text: "What language is spoken there?" })); // removes the first user's message
await memory.add(BaseMessage.of({ role: "assistant", text: "French" })); // removes the first assistant's message

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 3
console.log(memory.messages);
