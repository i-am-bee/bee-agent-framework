import { Serializer } from "bee-agent-framework/serializer/serializer";

class MyClass {
  constructor(public readonly name: string) {}
}

Serializer.register(MyClass, {
  // Defines how to transform a class to a plain object (snapshot)
  toPlain: (instance) => ({ name: instance.name }),
  // Defines how to transform a plain object (snapshot) a class instance
  fromPlain: (snapshot) => new MyClass(snapshot.name),

  // optional handlers to support lazy initiation (handling circular dependencies)
  createEmpty: () => new MyClass(""),
  updateInstance: (instance, update) => {
    Object.assign(instance, update);
  },
});

const instance = new MyClass("Bee");
const serialized = Serializer.serialize(instance);
const deserialized = Serializer.deserialize<MyClass>(serialized);

console.info(instance);
console.info(deserialized);
