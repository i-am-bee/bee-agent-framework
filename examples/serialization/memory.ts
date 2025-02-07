import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { AssistantMessage, UserMessage } from "bee-agent-framework/backend/message";

const memory = new TokenMemory();
await memory.add(new UserMessage("What is your name?"));

const serialized = await memory.serialize();
const deserialized = await TokenMemory.fromSerialized(serialized);

await deserialized.add(new AssistantMessage("Bee"));
