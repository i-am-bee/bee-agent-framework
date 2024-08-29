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

The Bee framework makes it easy to build agentic worfklows with leading open-source and proprietary models. We’re working on bringing model-agnostic support to any LLM to help developers avoid model provider lock-in.

## Key Features

- 🤖 **AI agents**: Use our powerful [Bee agent](https://github.com/i-am-bee/bee-agent-framework/tree/main?tab=readme-ov-file#get-started-with-bee) or [build your own](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#agents).
- 🛠️ **Tools**: Use our [built-in tools](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#tools) or create your own in Javascript/Python.
- 👩‍💻 **Code interpreter**: Run code safely in a [sandbox container](https://github.com/i-am-bee/bee-code-interpreter).
- 💾 **Memory**: Multiple [strategies](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#memory) to optimize token spend.
- ⏸️ **Serialization** Handle complex agentic workflows and easily pause/resume them [without losing state](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#serializer).
- 🔍 **Traceability**: Get full visibility of your agent’s inner workings, [log](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#logger) all running events, and use our MLflow integration (coming soon) to debug performance.
- 🎛️ **Production-level** control with [caching](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#cache) and [error handling](https://github.com/i-am-bee/bee-agent-framework/blob/main/docs/overview.md#errors).
- 🚧 (Coming soon) **Evaluation**: Run evaluation jobs with your own data source (custom csv or Airtable).
- 🚧 (Coming soon) **Model-agnostic support**: Change model providers in 1 line of code without breaking your agent’s functionality.
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

```typescript
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { TokenMemory } from "bee-agent-framework/memory/tokenMemory";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";

const llm = new OllamaChatLLM(); // default is llama3.1 (7b), it is recommended to use 70b model
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

➡️ See a more [advanced example](./examples/agents/bee.ts).

➡️ All examples can be found in the [examples](./examples) directory.

### Local Installation (Python Interpreter + Interactive CLI)

> _Note: `yarn` should be installed via Corepack ([tutorial](https://yarnpkg.com/corepack))_

> _Note: To make any asset available to a local code interpreter place them the following directory: ./examples/tmp/local_

> _Note: Docker distribution with support for compose is required, the following are supported:_
>
> - [Rancher](https://www.rancher.com/) - recommended
> - [Docker](https://www.docker.com/)
> - [Podman](https://podman.io/) - requires [compose](https://podman-desktop.io/docs/compose/setting-up-compose) and **rootful machine** (if your current machine is rootless, please create a new one)

1. Clone the repository `git clone git@github.com:i-am-bee/bee-agent-framework`.
2. Install dependencies `yarn install`.
3. Create `.env` (from `.env.template`) and fill in missing values (if any).
4. Start the code interpreter `yarn run infra:start-code-interpreter`.
5. Start the agent `yarn run start:bee` (it runs ./examples/agents/bee.ts file).

### 🛠️ Tools

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

### 🔌️ Adapters (LLM - Inference providers)

| Name                                                                      | Description                                                                             |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Ollama`                                                                  | LLM + ChatLLM support ([example](./examples/llms/providers/ollama.ts))                  |
| `LangChain`                                                               | Use any LLM that LangChain supports ([example](./examples/llms/providers/langchain.ts)) |
| `WatsonX`                                                                 | LLM + ChatLLM support ([example](./examples/llms/providers/watsonx.ts))                 |
| `BAM (IBM Internal)`                                                      | LLM + ChatLLM support ([example](./examples/llms/providers/bam.ts))                     |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                                                                                         |

### 📦 Modules

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

To see more in-depth explanation see [docs](./docs/overview.md).

## Tutorials

🚧 Coming soon 🚧

## Roadmap

- Evaluation with MLFlow integration
- JSON encoder/decoder for model-agnostic support
- Chat Client (GUI)
- Structured outputs
- Improvements to base Bee agent
- Guardrails
- 🚧 TBD 🚧

## Contribution guidelines

The Bee Agent Framework is an open-source project and we ❤️ contributions.

### Feature contributions

You can get started with any ticket market as “good first issue”.

**Have an idea for a new feature?** We recommend you first talk to a maintainer prior to spending a lot of time making a pull request that may not align with the project roadmap.

### Bugs

We are using [GitHub Issues](https://github.com/i-am-bee/bee-agent-framework/issues) to manage our public bugs. We keep a close eye on this, so before filing a new issue, please check to make sure it hasn't already been logged.

### Code of conduct

This project and everyone participating in it are governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [full text](./CODE_OF_CONDUCT.md) so that you can read which actions may or may not be tolerated.

## Legal notice

All content in these repositories including code has been provided by IBM under the associated open source software license and IBM is under no obligation to provide enhancements, updates, or support. IBM developers produced this code as an open source project (not as an IBM product), and IBM makes no assertions as to the level of quality nor security, and will not be maintaining this code going forward.
