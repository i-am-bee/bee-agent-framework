# Migration Guide

## 0.0.X -> 0.0.1 (2025-02-07)

### Notes

- Tokenization has been removed
- IBMvLLM adapter has been removed
- Non-chat LLMs have been removed
- `ChatLLM` class were replaced by `ChatModel` class.
- `BaseMessage` class were replaced by `Message` and its subtypes (`UserMessage`, `AssistantMessage`, `SystemMessage`, `ToolMessage`).
- `TokenMemory` no longer uses `LLM` instance to infer `maxTokens`, user needs to that manually (if needed).

### LLMs

#### Old

```ts

```

#### New

```ts

```

### Serialization

Following methods are now asynchronous (they were synchronous).

#### Serializable objects

- `serialize()`
- `deserialize()`
- `createSnapshot()`
- `loadSnapshot()`

- `Serializer.fromSerialized()`
- `Serializer.fromSnapshot()`
