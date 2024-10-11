# Overview

## 📦 Modules

The source directory (`src`) provides numerous modules that one can use.

| Name                                 | Description                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| [**agents**](./agents.md)            | Base classes defining the common interface for agent.                                       |
| [**llms**](./llms.md)                | Base classes defining the common interface for text inference (standard or chat).           |
| [**template**](./templates.md)       | Prompt Templating system based on `Mustache` with various improvements.                     |
| [**memory**](./memory.md)            | Various types of memories to use with agent.                                                |
| [**tools**](./tools.md)              | Tools that an agent can use.                                                                |
| [**cache**](./cache.md)              | Preset of different caching approaches that can be used together with tools.                |
| **errors**                           | Base framework error classes used by each module.                                           |
| **adapters**                         | Concrete implementations of given modules for different environments.                       |
| **logger**                           | Core component for logging all actions within the framework.                                |
| [**serializer**](./serialization.md) | Core component for the ability to serialize/deserialize modules into the serialized format. |
| **version**                          | Constants representing the framework (e.g., latest version)                                 |
| **internals**                        | Modules used by other modules within the framework.                                         |

### Emitter

> Location within the framework `bee-agent-framework/emitter`.

An emitter is a core functionality of the framework that gives you the ability to see what is happening under the hood. Because the vast majority of the frameworks components uses it, you can easily observe them.

```ts
import { Emitter, EventMeta } from "bee-agent-framework/emitter/emitter";

Emitter.root.match("*.*", (data: unknown, event: EventMeta) => {
  console.info(event.path, { data });
});
```

🚧 TBD

**👉 [Emitter + Agent example](../examples/agents/bee.ts) 👈**

### LLMs

Moved to a [standalone page](./llms.md).

### Templates

Moved to a [standalone page](./templates.md).

### Agents

Moved to a [standalone page](./agents.md).

### Memory

Moved to a [standalone page](./memory.md).

### Tools

Moved to a [standalone page](./tools.md).

### Cache

Moved to a [standalone page](./cache.md).

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

```ts
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

Moved to a [standalone page](./serialization.md).
