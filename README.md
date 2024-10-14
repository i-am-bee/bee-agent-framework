<p align="center">
    <img src="./docs/assets/Bee_Dark.svg" height="128">
    <h1 align="center">Bee Agent Framework</h1>
</p>

<p align="center">
  <a aria-label="Join the community on GitHub" href="https://github.com/i-am-bee/bee-agent-framework/discussions">
    <img alt="" src="https://img.shields.io/badge/Join%20the%20community-blueviolet.svg?style=for-the-badge&labelColor=000000&label=Bee">
  </a>
  <h4 align="center">Open-source framework for building, deploying, and serving powerful agentic workflows at scale.</h4>
</p>

The Bee Agent Framework makes it easy to build scalable agent-based workflows with your model of choice. Our default agent, [Bee](https://github.com/i-am-bee/bee-agent-framework/tree/main?tab=readme-ov-file#get-started-with-bee), is designed to perform robustly with [Llama 3.1](https://ai.meta.com/blog/meta-llama-3-1/), and we're actively working on optimizing its performance with other popular LLMs.<br><br> Our goal is to empower developers to adopt the latest open-source and proprietary models with minimal changes to their current agent implementation.

## Key Features

- 🤖 **AI agents**: Use our powerful [Bee agent](./docs/agents.md) or [build your own](./docs/agents.md).
- 🛠️ **Tools**: Use our [built-in tools](./docs/tools.md) or [create your own](./docs/tools.md) in Javascript/Python.
- 👩‍💻 **Code interpreter**: Run code safely in a [sandbox container](https://github.com/i-am-bee/bee-code-interpreter).
- 💾 **Memory**: Multiple [strategies](./docs/memory.md) to optimize token spend.
- ⏸️ **Serialization** Handle complex agentic workflows and easily pause/resume them [without losing state](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#serializer).
- 🔍 **Traceability**: Get full visibility of your agent’s inner workings, [log](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#logger) all running events, and use our MLFlow integration (coming out next week) to debug performance.
- 🎛️ **Production-level** control with [caching](./docs/cache.md) and [error handling](./docs/errors.md).
- 🚧 (Coming soon) **API**: Configure and deploy your agents with a production-hardened API.
- 🚧 (Coming soon) **Chat UI**: Serve your agent to users in a delightful GUI with built-in transparency, explainability, and user controls.
- ... more on our [Roadmap](#roadmap)

## Getting started

> [!TIP]
>
> Would you like a fully set-up TypeScript project with Bee, Code Interpreter, and Observability? Check out our [Bee Framework Starter](https://github.com/i-am-bee/bee-agent-framework-starter).

### Installation

```shell
npm install bee-agent-framework
```

or

```shell
yarn add bee-agent-framework
```

### Example

```ts
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";

const llm = new OllamaChatLLM(); // default is llama3.1 (8B), it is recommended to use 70B model

const agent = new BeeAgent({
  llm, // for more explore 'bee-agent-framework/adapters'
  memory: new TokenMemory({ llm }), // for more explore 'bee-agent-framework/memory'
  tools: [new DuckDuckGoSearchTool(), new OpenMeteoTool()], // for more explore 'bee-agent-framework/tools'
});

const response = await agent
  .run({ prompt: "What's the current weather in Las Vegas?" })
  .observe((emitter) => {
    emitter.on("update", async ({ data, update, meta }) => {
      console.log(`Agent (${update.key}) 🤖 : `, update.value);
    });
  });

console.log(`Agent 🤖 : `, response.result.text);
```

To run this example, be sure that you have installed [ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.

➡️ See a more [advanced example](./examples/agents/bee.ts).

➡️ All examples can be found in the [examples](./examples) directory.

➡️ To run an arbitrary example, use the following command `yarn start examples/agents/bee.ts` (just pass the appropriate path to the desired example).

### Local Installation

> [!NOTE]
>
> `yarn` should be installed via Corepack ([tutorial](https://yarnpkg.com/corepack))

1. Clone the repository `git clone git@github.com:i-am-bee/bee-agent-framework`.
2. Install dependencies `yarn install`.
3. Create `.env` (from `.env.template`) and fill in missing values (if any).
4. Start the agent `yarn run start:bee` (it runs `./examples/agents/bee.ts` file).

### 📦 Modules

The source directory (`src`) provides numerous modules that one can use.

| Name                                      | Description                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| [**agents**](./docs/agents.md)            | Base classes defining the common interface for agent.                                       |
| [**llms**](./docs/llms.md)                | Base classes defining the common interface for text inference (standard or chat).           |
| [**template**](./docs/templates.md)       | Prompt Templating system based on `Mustache` with various improvements.                     |
| [**memory**](./docs/memory.md)            | Various types of memories to use with agent.                                                |
| [**tools**](./docs/tools.md)              | Tools that an agent can use.                                                                |
| [**cache**](./docs/cache.md)              | Preset of different caching approaches that can be used together with tools.                |
| [**errors**](./docs/errors.md)            | Error classes and helpers to catch errors fast.                                             |
| **adapters**                              | Concrete implementations of given modules for different environments.                       |
| [**logger**](./docs/logger.md)            | Core component for logging all actions within the framework.                                |
| [**serializer**](./docs/serialization.md) | Core component for the ability to serialize/deserialize modules into the serialized format. |
| [**version**](./docs/version.md)          | Constants representing the framework (e.g., latest version)                                 |
| **internals**                             | Modules used by other modules within the framework.                                         |

To see more in-depth explanation see [overview](./docs/overview.md).

## Tutorials

🚧 Coming soon 🚧

## Roadmap

- MLFlow integration for trace observability (coming out next week)
- Improvements to Bee agent and performance optimization with Llama3.1 and Granite model suites
- API + UI (chat interface)
- Python SDK
- 🚧 TBD 🚧

## Contribution guidelines

The Bee Agent Framework is an open-source project and we ❤️ contributions.

If you'd like to contribute to Bee, please take a look at our [contribution guidelines](./CONTRIBUTING.md).

### Bugs

We are using [GitHub Issues](https://github.com/i-am-bee/bee-agent-framework/issues) to manage our public bugs. We keep a close eye on this, so before filing a new issue, please check to make sure it hasn't already been logged.

### Code of conduct

This project and everyone participating in it are governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [full text](./CODE_OF_CONDUCT.md) so that you can read which actions may or may not be tolerated.

## Legal notice

All content in these repositories including code has been provided by IBM under the associated open source software license and IBM is under no obligation to provide enhancements, updates, or support. IBM developers produced this code as an open source project (not as an IBM product), and IBM makes no assertions as to the level of quality nor security, and will not be maintaining this code going forward.

## Contributors

Special thanks to our contributors for helping us improve Bee Agent Framework.

<a href="https://github.com/i-am-bee/bee-agent-framework/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=i-am-bee/bee-agent-framework" />
</a>
