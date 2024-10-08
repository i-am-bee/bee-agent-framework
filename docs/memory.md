# Memory

> [!TIP]
>
> Location within the framework `bee-agent-framework/memory`.

Memory in the context of an agent refers to the system's capability to store, recall, and utilize information from past interactions. This enables the agent to maintain context over time, improve its responses based on previous exchanges, and provide a more personalized experience.

## Usage

### Capabilities showcase

<!-- embedme examples/memory/unconstrainedMemory.ts -->

```ts
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new UnconstrainedMemory();

// Single message
await memory.add(
  BaseMessage.of({
    role: "system",
    text: `You are a helpful and funny assistant.`,
  }),
);

// Multiple messages
await memory.addMany([
  BaseMessage.of({ role: "user", text: `What can you do?` }),
  BaseMessage.of({
    role: "assistant",
    text: `Get it? I'm a helpful assistant, I can answer questions, provide information, and even tell jokes!`,
  }),
]);

console.info(memory.isEmpty()); // false
console.info(memory.messages); // prints all saved messages
console.info(memory.asReadOnly()); // returns a NEW read only instance
memory.reset(); // removes all messages
```

_Source: [examples/memory/unconstrainedMemory.ts](/examples/memory/unconstrainedMemory.ts)_

> [!TIP]
>
> You can create a new read-only memory instance by calling `asReadOnly` method on the exiting one.

### Usage with LLMs

<!-- embedme examples/memory/llmMemory.ts -->

```ts
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new UnconstrainedMemory();
await memory.addMany([
  BaseMessage.of({
    role: "system",
    text: `Always respond very concisely.`,
  }),
  BaseMessage.of({ role: "user", text: `Give me first 5 prime numbers.` }),
]);

// Generate response
const llm = new OllamaChatLLM();
const response = await llm.generate(memory.messages);
await memory.add(BaseMessage.of({ role: "assistant", text: response.getTextContent() }));

console.log(`Conversation history`);
for (const message of memory) {
  console.log(`${message.role}: ${message.text}`);
}
```

_Source: [examples/memory/llmMemory.ts](/examples/memory/llmMemory.ts)_

> [!TIP]
>
> Memory for non-chat LLMs works exactly the same way.

### Usage with agents

<!-- embedme examples/memory/agentMemory.ts -->

```ts
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const agent = new BeeAgent({
  memory: new UnconstrainedMemory(),
  llm: new OllamaChatLLM(),
  tools: [],
});
await agent.run({ prompt: "Hello world!" });

console.info(agent.memory.messages.length); // 2

const userMessage = agent.memory.messages[0];
console.info(`User: ${userMessage.text}`); // User: Hello world!

const agentMessage = agent.memory.messages[1];
console.info(`Agent: ${agentMessage.text}`); // Agent: Hello! It's nice to chat with you.
```

_Source: [examples/memory/agentMemory.ts](/examples/memory/agentMemory.ts)_

> [!TIP]
>
> If your memory already contains the user message, run the agent with `prompt: null`.

> [!NOTE]
>
> Agents internally uses `TokenMemory` to store intermediate steps for a given invocation.

> [!NOTE]
>
> Agents typically works with the memory in a similar as was just shown.

## Memory types

The framework provides multiple out-of-the-box memory implementations.

### UnconstrainedMemory

Unlimited in size.

```ts
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new UnconstrainedMemory();
await memory.add(BaseMessage.of({ role: "user", text: `Give me first 5 prime numbers.` }));

console.log(memory.isEmpty()); // false
console.log(memory.messages.length); // 1
```

### SlidingMemory

Keeps last `k` entries in the memory. The oldest ones are deleted (if not specified otherwise).

<!-- embedme examples/memory/slidingMemory.ts -->

```ts
import { SlidingMemory } from "bee-agent-framework/memory/slidingMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new SlidingMemory({
  size: 3, // (required) number of messages that can be in the memory at a single moment
});

await memory.add(BaseMessage.of({ role: "system", text: "You are a guide through France." }));
await memory.add(BaseMessage.of({ role: "user", text: "What is the capital?" }));
await memory.add(BaseMessage.of({ role: "assistant", text: "Paris" }));
await memory.add(BaseMessage.of({ role: "user", text: "What language is spoken there?" })); // removes the system message

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 3
console.log(memory.messages); // 3
```

_Source: [examples/memory/slidingMemory.ts](/examples/memory/slidingMemory.ts)_

#### Advanced

You can customize which messages should be deleted and which should be preserved.

<!-- embedme examples/memory/slidingMemoryCustom.ts -->

```ts
import { SlidingMemory } from "bee-agent-framework/memory/slidingMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";

const memory = new SlidingMemory({
  size: 3, // (required) number of messages that can be in the memory at a single moment
  handlers: {
    // we select a first non-system message
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
console.log(memory.messages); // 3
```

_Source: [examples/memory/slidingMemoryCustom.ts](/examples/memory/slidingMemoryCustom.ts)_

### TokenMemory

Ensures that the number of tokens of all messages is below the given threshold. The oldest are removed.

<!-- embedme examples/memory/tokenMemory.ts -->

```ts
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const llm = new OllamaChatLLM();
const memory = new TokenMemory({
  llm,
  maxTokens: undefined, // optional (default is inferred from the passed LLM instance),
  capacityThreshold: 0.75, // maxTokens*capacityThreshold = threshold where we start removing old messages
  syncThreshold: 0.25, // maxTokens*syncThreshold = threshold where we start to use a real tokenization endpoint instead of guessing the number of tokens
  handlers: {
    // optional way to define which message should be deleted (default is the oldest one)
    removalSelector: (messages) => messages.find((msg) => msg.role !== "system")!,

    // optional way to estimate the number of tokens in a message before we use the actual tokenize endpoint (number of tokens < maxTokens*syncThreshold)
    estimate: (msg) => Math.ceil((msg.role.length + msg.text.length) / 4),
  },
});

await memory.add(BaseMessage.of({ role: "system", text: "You are a helpful assistant." }));
await memory.add(BaseMessage.of({ role: "user", text: "Hello world!" }));

console.info(memory.isDirty); // is the consumed token count estimated or retrieved via the tokenize endpoint?
console.log(memory.tokensUsed); // number of used tokens
console.log(memory.stats()); // prints statistics
await memory.sync(); // calculates real token usage for all messages marked as "dirty"
```

### SummarizeMemory

Only a single summarization of the conversation is preserved. Summarization is updated with every new message.

<!-- embedme examples/memory/summarizeMemory.ts -->

```ts
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { SummarizeMemory } from "bee-agent-framework/memory/summarizeMemory";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const memory = new SummarizeMemory({
  llm: new OllamaChatLLM({
    modelId: "llama3.1",
    parameters: {
      temperature: 0,
      num_predict: 250,
    },
  }),
});

await memory.addMany([
  BaseMessage.of({ role: "system", text: "You are a guide through France." }),
  BaseMessage.of({ role: "user", text: "What is the capital?" }),
  BaseMessage.of({ role: "assistant", text: "Paris" }),
  BaseMessage.of({ role: "user", text: "What language is spoken there?" }),
]);

console.info(memory.isEmpty()); // false
console.log(memory.messages.length); // 1
console.log(memory.messages[0].text); // The capital city of France is Paris, ...
```

_Source: [examples/memory/summarizeMemory.ts](/examples/memory/summarizeMemory.ts)_

## Creating a custom memory provider

To create your memory implementation, you must implement the `BaseMemory` class.

<!-- embedme examples/memory/custom.ts -->

```ts
import { BaseMemory } from "bee-agent-framework/memory/base";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { NotImplementedError } from "bee-agent-framework/errors";

export class MyMemory extends BaseMemory {
  get messages(): readonly BaseMessage[] {
    throw new NotImplementedError("Method not implemented.");
  }

  add(message: BaseMessage): Promise<void> {
    throw new NotImplementedError("Method not implemented.");
  }

  reset(): void {
    throw new NotImplementedError("Method not implemented.");
  }

  createSnapshot(): unknown {
    throw new NotImplementedError("Method not implemented.");
  }

  loadSnapshot(state: ReturnType<typeof this.createSnapshot>): void {
    throw new NotImplementedError("Method not implemented.");
  }
}
```

_Source: [examples/memory/custom.ts](/examples/memory/custom.ts)_

The simplest implementation is `UnconstrainedMemory`, which can be found [here](/src/memory/unconstrainedMemory.ts).
