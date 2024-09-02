# Overview

## 📦 Modules

The source directory (`src`) provides numerous modules that one can use.

| Name           | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| **agents**     | Base classes defining the common interface for agent.                                       |
| **llms**       | Base classes defining the common interface for text inference (standard or chat).           |
| **template**   | Prompt Templating system based on `Mustache` with various improvements\_.                   |
| **memory**     | Various types of memories to use with agent.                                                |
| **tools**      | Tools that an agent can use.                                                                |
| **cache**      | Preset of different caching approaches that can be used together with tools.                |
| **errors**     | Base framework error classes used by each module.                                           |
| **adapters**   | Concrete implementations of given modules for different environments.                       |
| **logger**     | Core component for logging all actions within the framework.                                |
| **serializer** | Core component for the ability to serialize/deserialize modules into the serialized format. |
| **version**    | Constants representing the framework (e.g., latest version)                                 |
| **internals**  | Modules used by other modules within the framework.                                         |

### Emitter

> Location within the framework `bee-agent-framework/emitter`.

An emitter is a core functionality of the framework that gives you the ability to see what is happening under the hood. Because the vast majority of the frameworks components uses it, you can easily observe them.

```typescript
import { Emitter, EventMeta } from "@/emitter/emitter.js";

Emitter.root.match("*.*", (data: unknown, event: EventMeta) => {
  console.info(event.path, { data });
});
```

🚧 TBD

**👉 [Emitter + Agent example](../examples/agents/bee.ts) 👈**

### LLMs

A Large Language Model (LLM) is an AI designed to understand and generate human-like text.
Trained on extensive text data, LLMs learn language patterns, grammar, context, and basic reasoning to perform tasks like text completion, translation, summarization, and answering questions.

The framework defines LLM via the `BaseLLM` class (`src/llms/base.ts`).
Typically, you either want to implement `LLM` (string <-> string) or `ChatLLM` (Message <-> Message).

**👉 [See Examples](../examples/llms) 👈**

### Templates

> Location within the framework `bee-agent-framework/template`.

Prompt templating involves creating structured inputs to guide LLMs in generating desired responses.
Users can effectively steer the model's output towards particular formats or tones by designing specific templates.
This technique enhances the model's ability to produce consistent and relevant results, making it particularly useful for applications like automated content creation, customer service scripts, and interactive storytelling.
Prompt templating ensures that the LLM's responses align more closely with the intended context and purpose.

**👉 [See Examples](../examples/template.ts) 👈**

### Agents

🚧 TBD 🚧

**How to implement your agent runtime?**

By implementing the agent base interface defined in `src/agents/base.ts.`

### Memory

> Location within the framework `bee-agent-framework/memory`.

Memory in the context of an agent refers to the system's capability to store, recall, and utilize information from past interactions.
This enables the agent to maintain context over time, improve its responses based on previous exchanges, and provide a more personalized experience.

The framework provides out-of-the-box following types of memories.

| Name                                                                      | Description                                                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `UnconstrainedMemory`                                                     | Unlimited size. It is suitable if your context window is huge.                                                 |
| `SlidingWindowMemory`                                                     | Keeps last `k` messages in the memory. The oldest ones are deleted.                                            |
| `TokenMemory`                                                             | Ensures that the number of tokens of all messages is below the given threshold. The oldest are removed.        |
| `SummarizeMemory`                                                         | Only a single summarization of the conversation is preserved. Summarization is updated with every new message. |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                                                                |

### Tools

> Location within the framework `bee-agent-framework/tools`.

Tools in the context of an agent refer to additional functionalities or capabilities integrated with the agent to perform specific tasks beyond text processing.
These tools extend the agent's abilities, allowing it to interact with external systems, access information, and execute actions.

The framework provides out-of-the-box tools.

| Name                                                                      | Description                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `PythonTool`                                                              | Run arbitrary Python code in the remote environment.                      |
| `WikipediaTool`                                                           | Search for data on Wikipedia.                                             |
| `DuckDuckGoTool`                                                          | Search for data on DuckDuckGo.                                            |
| `LLMTool`                                                                 | Uses an LLM to process input data.                                        |
| `DynamicTool`                                                             | Construct to create dynamic tools.                                        |
| `ArXivTool`                                                               | Retrieves research articles published on arXiv.                           |
| `WebCrawlerTool`                                                          | Retrieves content of an arbitrary website.                                |
| `CustomTool`                                                              | Runs your own Python function in the remote environment.                  |
| `OpenMeteoTool`                                                           | Retrieves current, previous, or upcoming weather for a given destination. |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                           |

To create your own tool, you need to either implement the `Tool` class or use `DynamicTool.` More information is available in the [tool documentation](tools.md).

### Cache

> Location within the framework `bee-agent-framework/cache`.

> Note: Cache can be used directly with Tools. Pass the appropriate `Cache` instance to the `Tool` constructor.

Caching is a process used to temporarily store copies of data or computations in a cache (a storage location) to facilitate faster access upon future requests.
The primary purpose of caching is to improve the efficiency and performance of systems by reducing the need to repeatedly fetch or compute the same data from a slower or more resource-intensive source.

The framework provides out-of-the-box following cache implementations.

| Name                                                                      | Description                                                        |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `UnconstrainedCache`                                                      | Unlimited size.                                                    |
| `FileCache`                                                               | Saves/Loads entries to/from a file.                                |
| `SlidingCache`                                                            | Keeps last `k` entries in the memory. The oldest ones are deleted. |
| `NullCache`                                                               | Disables caching.                                                  |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                    |

To create your cache implementation, you must implement the `BaseCache` class.

### Errors

> Location within the framework `bee-agent-framework/error`.

> Note: We guarantee that every framework-related error is an instance of the `FrameworkError` class.

🚧 TBD

### Logger

> Location within the framework `bee-agent-framework/logger`.
> To log all events in the framework set log level to 'TRACE' (root logger observes the root emitter).

A logger is a component used for recording and tracking events, errors, and other significant actions that occur during an application's execution.
The primary purpose of a logger is to provide developers and system administrators with insights into the application's behavior, performance, and potential issues.

Every component within the framework uses the `Logger` class either by directly creating an instance of it or because it is being passed from the creator.

```typescript
import { Logger, LoggerLevel } from "bee-agent-framework/logger";

Logger.defaults.pretty = true; // (override default settings)
const root = Logger.root; // get root logger
root.level = LoggerLevel.WARN; // update the logger level (default is LoggerLevel.INFO)
```

Some of the `Logger` defaults can be controlled via the following environmental variables.

- `BEE_FRAMEWORK_LOG_LEVEL`
- `BEE_FRAMEWORK_LOG_PRETTY`

> Note: The framework `Logger` class is an abstraction on top of the most popular `pino` logger.

### Serializer

> Location within the framework `bee-agent-framework/serializer`.

Serialization is the process of converting complex data structures or objects into a format that can be easily stored, transmitted, and reconstructed later.

Most parts of the framework implement the internal `Serializable` class, which exposes the following functionalities.

- `createSnapshot` (method)
- `loadSnapshot` (method)

- `fromSerialized` (static method)
- `fromSnapshot` (static method)

If you want to serialize something that the framework doesn't know how to process, the following error will be thrown: `SerializerError`.
To resolve such an issue, you need to tell (register) the appropriate class to the framework via the `Serializer.register` method.

**👉 [Emitter + Agent example](../examples/agents/bee_reusable.ts) 👈**

## 🚧 More content TBD 🚧
