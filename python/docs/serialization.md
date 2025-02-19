# Serialization

*Disclaimer: The notes below may refer to the TypeScript version or missing files as the Python version moves toward parity in the near future. Additional Python examples coming soon. TODO*

> [!TIP]
>
> Location within the framework `beeai/serializer`.

Serialization is a process of converting complex data structures or objects into a format that can be easily stored, transmitted, and reconstructed later.
Serialization is a difficult task, and JavaScript does not provide a magic tool to serialize and deserialize an arbitrary input. That is why we made such one.

```py
```

_Source: /examples/tools/base.py TODO

> [!NOTE]
>
> Serializer knows how to serialize/deserialize the most well-known JavaScript data structures. Continue reading to see how to register your own.

## Being Serializable

Most parts of the framework implement the internal [`Serializable`](/beeai/internals/serializable.py) class, which exposes the following methods.

- `createSnapshot` (returns an object that "snapshots" the current state)
- `loadSnapshot` (applies the provided snapshot to the current instance)

- `fromSerialized` (static, creates the new instance from the given serialized input)
- `fromSnapshot` (static, creates the new instance from the given snapshot)

See the direct usage on the following memory example.

```py
```

_Source: /examples/serialization/memory.py TODO

### Serializing unknowns

If you want to serialize a class that the `Serializer` does not know, it throws the `SerializerError` error.
However, you can tell the `Serializer` how to work with your class by registering it as a serializable.

```py
```

_Source: /examples/serialization/customExternal.py TODO

or you can extend the `Serializable` class.

```py
```

_Source: /examples/serialization/customInternal.py TODO

> [!TIP]
>
> Most framework components are `Serializable`.

### Context matters

```py
```

_Source: /examples/serialization/context.py TODO

> [!IMPORTANT]
>
> Ensuring that all classes are registered in advance can be annoying, but there's a good reason for that.
> If we imported all the classes for you, that would significantly increase your application's size and bootstrapping time + you would have to install all peer dependencies that you may not even need.
