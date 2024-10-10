import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

// String containing serialized `UnconstrainedMemory` instance with one message in it.
const serialized = `{"__version":"0.0.0","__root":{"__serializer":true,"__class":"Object","__ref":"5","__value":{"target":"UnconstrainedMemory","snapshot":{"__serializer":true,"__class":"Object","__ref":"4","__value":{"messages":{"__serializer":true,"__class":"Array","__ref":"1","__value":[{"__serializer":true,"__class":"BaseMessage","__ref":"2","__value":{"role":"user","text":"Serialization is amazing, isn't?","meta":{"__serializer":true,"__class":"Undefined","__ref":"3"}}}]}}}}}}`;

// If `BaseMessage` was not imported the serialization would fail because the `BaseMessage` had no chance to register itself.
const memory = UnconstrainedMemory.fromSerialized(serialized, {
  // this part can be omitted if all classes used in the serialized string are imported (and have `static` register block) or at least one initiated
  extraClasses: [BaseMessage],
});
console.info(memory.messages);
