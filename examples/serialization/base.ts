import { Serializer } from "bee-agent-framework/serializer/serializer";

const original = new Date("2024-01-01T00:00:00.000Z");
const serialized = Serializer.serialize(original);
const deserialized = Serializer.deserialize(serialized);

console.info(deserialized instanceof Date); // true
console.info(original.toISOString() === deserialized.toISOString()); // true
