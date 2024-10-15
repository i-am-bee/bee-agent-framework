<p align="center">
    <img src="./assets/Bee_Dark.svg" height="128">
    <h1 align="center">Bee Agent Framework</h1>
</p>

<p align="center">
  <a aria-label="Join the community on GitHub" href="https://github.com/i-am-bee/bee-agent-framework/discussions">
    <img alt="" src="https://img.shields.io/badge/Join%20the%20community-blueviolet.svg?style=for-the-badge&labelColor=000000&label=Bee">
  </a>
  <h4 align="center">Open-source framework for building, deploying, and serving powerful agentic workflows at scale.</h4>
</p>

The Bee Agent Framework makes it easy to build scalable agent-based workflows with your model of choice. Our default agent, [Bee](#get-started-with-bee), is designed to perform robustly with [Llama 3.1](https://ai.meta.com/blog/meta-llama-3-1/), and we're actively working on optimizing its performance with other popular LLMs.<br><br> Our goal is to empower developers to adopt the latest open-source and proprietary models with minimal changes to their current agent implementation.

## Key Features

- 🤖 **AI agents**: Use our powerful [Bee agent](agents.md) or [build your own](agents.md#creating-your-own-agent).
- 🛠️ **Tools**: Use our [built-in tools](tools.md#built-in-tools) or [create your own](tools.md#writing-a-new-tool) in Javascript/Python.
- 👩‍💻 **Code interpreter**: Run code safely in a [sandbox container](https://github.com/i-am-bee/bee-code-interpreter).
- 💾 **Memory**: Multiple [strategies](memory.md) to optimize token spend.
- ⏸️ **Serialization** Handle complex agentic workflows and easily pause/resume them [without losing state](overview.md#serializer).
- 🔍 **Traceability**: Get full visibility of your agent’s inner workings, [log](overview.md#logger) all running events, and use our MLflow integration (coming soon) to debug performance.
- 🎛️ **Production-level** control with [caching](cache.md) and [error handling](overview.md#errors).
- 🚧 (Coming soon) **API**: Configure and deploy your agents with a production-hardened API.
- 🚧 (Coming soon) **Chat UI**: Serve your agent to users in a delightful GUI with built-in transparency, explainability, and user controls.
- ... more on our [Roadmap](#roadmap)

## Get started with Bee

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

➡️ See a more [advanced example](/examples/agents/bee.ts).

➡️ All examples can be found in the [examples](/examples) directory.

➡️ To run an arbitrary example, use the following command `yarn start -- examples/agents/bee.ts` (just pass the appropriate path to the desired example).

### Local Installation (Python Interpreter + Interactive CLI)

> [!NOTE]
>
> `yarn` should be installed via Corepack ([tutorial](https://yarnpkg.com/corepack))\_

> [!NOTE]
>
> To make any asset available to a local code interpreter place them the following directory: ./examples/tmp/local\_

> [!NOTE]
>
> Docker distribution with support for compose is required, the following are supported:
>
> - [Docker](https://www.docker.com/)
> - [Rancher](https://www.rancher.com/) - macOS users may want to use VZ instead of QEMU
> - [Podman](https://podman.io/) - requires [compose](https://podman-desktop.io/docs/compose/setting-up-compose) and **rootful machine** (if your current machine is rootless, please create a new one)

1. Clone the repository `git clone git@github.com:i-am-bee/bee-agent-framework`.
2. Install dependencies `yarn install`.
3. Create `.env` (from `.env.template`) and fill in missing values (if any).
4. Start the code interpreter `yarn run infra:start-code-interpreter`.
5. Start the agent `yarn run start:bee` (it runs ./examples/agents/bee.ts file).

### 🛠️ Tools

| Name                                                                      | Description                                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PythonTool`                                                              | Run arbitrary Python code in the remote environment.                           |
| `WikipediaTool`                                                           | Search for data on Wikipedia.                                                  |
| `GoogleSearchTool`                                                        | Search for data on Google using Custom Search Engine.                          |
| `DuckDuckGoTool`                                                          | Search for data on DuckDuckGo.                                                 |
| `SQLTool`                                                                 | Execute SQL queries against relational databases. [Instructions](sql-tool.md). |
| `CustomTool`                                                              | Run your own Python function in the remote environment.                        |
| `LLMTool`                                                                 | Use an LLM to process input data.                                              |
| `DynamicTool`                                                             | Construct to create dynamic tools.                                             |
| `ArXivTool`                                                               | Retrieve research articles published on arXiv.                                 |
| `WebCrawlerTool`                                                          | Retrieve content of an arbitrary website.                                      |
| `OpenMeteoTool`                                                           | Retrieve current, previous, or upcoming weather for a given destination.       |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                                |

### 🔌️ Adapters

| Name                                                                      | Description                                                                                                                              |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Ollama`                                                                  | LLM + ChatLLM support ([example](/examples/llms/providers/ollama.ts))           |
| `OpenAI`                                                                  | LLM + ChatLLM support ([example](/examples/llms/providers/openai.ts))           |
| `LangChain`                                                               | LLM + ChatLLM + Tool support ([example](/examples/llms/providers/langchain.ts)) |
| `WatsonX`                                                                 | LLM + ChatLLM support ([example](/examples/llms/providers/watsonx.ts))          |
| `Groq`                                                                    | ChatLLM support ([example](/examples/llms/providers/groq.ts))                   |
| `BAM (Internal)`                                                          | LLM + ChatLLM support ([example](/examples/llms/providers/bam.ts))              |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                                                                                          |

### 📦 Modules

The source directory (`src`) provides numerous modules that one can use.

| Name                                       | Description                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [**agents**](agents.md)                    | Base classes defining the common interface for agent.                                       |
| [**llms**](llms.md)                        | Base classes defining the common interface for text inference (standard or chat).           |
| [**template**](templates.md)               | Prompt Templating system based on `Mustache` with various improvements.                     |
| [**memory**](memory.md)                    | Various types of memories to use with agent.                                                |
| [**tools**](tools.md)                      | Tools that an agent can use.                                                                |
| [**cache**](cache.md)                      | Preset of different caching approaches that can be used together with tools.                |
| [**errors**](errors.md)                    | Base framework error classes used by each module.                                           |
| [**adapters**](llms.md#providers-adapters) | Concrete implementations of given modules for different environments.                       |
| [**logger**](logger.md)                    | Core component for logging all actions within the framework.                                |
| [**serializer**](serialization.md)         | Core component for the ability to serialize/deserialize modules into the serialized format. |
| [**version**](version.md)                  | Constants representing the framework (e.g., latest version)                                 |
| **internals**                              | Modules used by other modules within the framework.                                         |

To see more in-depth explanation see [docs](overview.md).

## Tutorials

🚧 Coming soon 🚧

## Roadmap

- MLFlow integration for trace observability
- Improvements to Bee agent and performance optimization with Llama3.1 and Granite model suites
- API
- Python SDK
- Structured outputs
- Chat Client (GUI)

- 🚧 TBD 🚧

## Contribution guidelines

The Bee Agent Framework is an open-source project and we ❤️ contributions.

If you'd like to contribute to Bee, please take a look at our [contribution guidelines](https://github.com/i-am-bee/bee-agent-framework/blob/main/CONTRIBUTING.md).

### Bugs

We are using [GitHub Issues](https://github.com/i-am-bee/bee-agent-framework/issues) to manage our public bugs. We keep a close eye on this, so before filing a new issue, please check to make sure it hasn't already been logged.

### Code of conduct

This project and everyone participating in it are governed by the [Code of Conduct](https://github.com/i-am-bee/bee-agent-framework/blob/main/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [full text](https://github.com/i-am-bee/bee-agent-framework/blob/main/CODE_OF_CONDUCT.md) so that you can read which actions may or may not be tolerated.

## Legal notice

All content in these repositories including code has been provided by IBM under the associated open source software license and IBM is under no obligation to provide enhancements, updates, or support. IBM developers produced this code as an open source project (not as an IBM product), and IBM makes no assertions as to the level of quality nor security, and will not be maintaining this code going forward.

## Contributors

Special thanks to our contributors for helping us improve Bee Agent Framework.

<a href="https://github.com/i-am-bee/bee-agent-framework/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=i-am-bee/bee-agent-framework" />
</a>
