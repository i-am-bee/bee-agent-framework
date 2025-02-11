# Migration Guide

## 0.0.X -> 0.1.0 (2025-02-11)

### Summary

- `ChatLLM` class was replaced by `ChatModel` class and embedding functionality has been replaced by `EmbeddingModel` class.
- `BaseMessage` class was replaced by `Message` and its subtypes (`UserMessage`, `AssistantMessage`, `SystemMessage`, `ToolMessage`).
- `TokenMemory` no longer uses `LLM` instance to infer `maxTokens`, user needs to do that manually (if needed).
- Tokenization has been removed.
- Non-Chat LLM class (`LLM`) has been removed.
- The`IBMvLLM` adapter has been removed.
- Parsers were moved from `bee-agent-framework/agents/parsers` to `bee-agent-framework/parsers`
- Parsers were moved from `bee-agent-framework/agents/parsers` to `bee-agent-framework/parsers`.

### Models

#### ❌ Old Way

```ts
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const model = new OllamaChatLLM({
  modelId: "llama3.1",
});

const response = await model.generate(
  [
    BaseMessage.of({
      role: "user",
      text: "Hello Bee!",
    }),
  ],
  {
    stream: true,
  },
);
console.log(response.getTextContent());
```

#### ✅ New Way

```ts
import { ChatModel, UserMessage } from "bee-agent-framework/backend/core";

const model = await ChatModel.fromName("ollama:llama3.1");
const response = await model.create({
  messages: [new UserMessage("Hello Bee!")],
});
console.log(response.getTextContent());
```

or you can initiate the provider directly

```ts
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/chat";
import { UserMessage } from "bee-agent-framework/backend/core";

const model = new OllamaChatModel("llama3.1");
const response = await model.create({
  messages: [new UserMessage("Hello Bee!")],
});
console.log(response.getTextContent());
```

More examples can be found in [Backend Documentation Page](/docs/backend.md).

### Messages

The `BaseMessage` class was replaced by `Message` and its subtypes (`UserMessage`, `AssistantMessage`, `SystemMessage`, `ToolMessage`).

#### ❌ Old Way

```ts
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
const a = BaseMessage.of({ role: "user", text: "hello", meta: { createdAt: new Date() } });
```

#### ✅ New Way

```ts
import { Message } from "bee-agent-framework/backend/core";

const a = Message.of({ role: "user", text: "Hello", meta: { createdAt: new Date() } });
```

The new version supports more complex content types.

```ts
import { UserMessage } from "bee-agent-framework/backend/core";

// using a factory function
const msg = new UserMessage({
  type: "file",
  data: await fs.promises.readFile("document.txt"),
  mimeType: "text/plain",
});
```

```ts
import { UserMessage } from "bee-agent-framework/backend/core";

// using a factory function
const msg = new UserMessage({
  type: "file",
  data: await fs.promises.readFile("document.txt"),
  mimeType: "text/plain",
});
```

```ts
import { UserMessage, AssistantMessage, SystemMessage } from "bee-agent-framework/backend/core";
const a = new UserMessage("Hello assistant!");
const b = new AssistantMessage("Hello user!");
const c = new SystemMessage("You are a helpful assistant.");
```

More examples can be found in [Backend Documentation Page](/docs/backend.md).

### Serialization

The following methods present in `Serializable` class are now asynchronous.

- `serialize`
- `deserialize`
- `createSnapshot`
- `loadSnapshot`

The same applies to the following static methods.

- `fromSerialized`
- `fromSnapshot`

#### ❌ Old Way

```ts
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";

const a = new TokenMemory();
const json = a.serialize();

const b = TokenMemory.fromSerialized(json);
```

#### ✅ New Way

```ts
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";

const a = new TokenMemory();
const json = await a.serialize();

const b = await TokenMemory.fromSerialized(json);
```
