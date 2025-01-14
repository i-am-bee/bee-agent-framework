<p align="center">
    <img alt="Bee Framework logo" src="/docs/assets/Bee_Dark.svg" height="128">
    <h1 align="center">Bee Agent Framework</h1>
</p>

<p align="center">
  <img align="cener" alt="Project Status: Alpha" src="https://img.shields.io/badge/Status-Alpha-red">

  <h4 align="center">Open-source framework for building, deploying, and serving powerful multi-agent workflows at scale.</h4>
</p>

🐝 **Bee Agent Framework** is an open-source TypeScript library for building **production-ready multi-agent systems**. Pick from a variety of [🌐 LLM providers](/docs/llms.md#providers-adapters), customize the [📜 prompt templates](/docs/templates.md), create [🤖 agents](/docs/agents.md), equip agents with pre-made [🛠️ tools](/docs/tools.md), and orchestrate [🤖🤝🤖 multi-agent workflows](/docs/workflows.md)! 🪄

## Latest updates

- 🚀 **2025-01-09**:
  - Introduced [Workflows](/docs/workflows.md), a way of building multi-agent systems.
  - Added support for [Model Context Protocol](https://i-am-bee.github.io/bee-agent-framework/#/tools?id=using-the-mcptool-class), featured on the [official page](https://modelcontextprotocol.io/clients#bee-agent-framework).
- 🚀 **2024-12-09**: Added support for [LLaMa 3.3](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct).
- 🚀 **2024-11-21**: Added an experimental [Streamlit agent](https://github.com/i-am-bee/bee-agent-framework/blob/main/src/agents/experimental/streamlit/agent.ts).

For a full changelog, see the [releases page](https://github.com/i-am-bee/bee-agent-framework/releases).

## Why pick Bee?

- ⚔️ **Battle-tested.** Bee Agent Framework is at the core of [BeeAI](https://iambee.ai), a powerful platform for building chat assistants and custom AI-powered apps. BeeAI is in a closed beta, but already used by hundreds of users. And it's [fully open-source](https://github.com/i-am-bee/bee-ui) too!
- 🚀 **Production-grade.** In an actual product, you have to reduce token spend through [memory strategies](/docs/memory.md), store and restore the agent state through [(de)serialization](/docs/serialization.md), generate [structured output](/examples/llms/structured.ts), or execute generated code in a [sandboxed environment](https://github.com/i-am-bee/bee-code-interpreter). Leave all that to Bee and focus on building!
- 🤗 **Built for open-source models.** Pick any LLM you want – including small and open-source models. The framework is designed to perform robustly with [Granite](https://www.ibm.com/granite/docs/) and [Llama 3.x](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct). A full agentic workflow can run on your laptop!
- 😢 **Bee cares about the sad path too.** Real-world applications encounter errors and failures. Bee lets you observe the full agent workflow through [events](/docs/emitter.md), collect [telemetry](/docs/instrumentation.md), [log](/docs/logger.md) diagnostic data, and throws clear and well-defined [exceptions](/docs/errors.md). Bees may be insects, but not bugs!
- 🌳 **A part of something greater.** Bee isn't just a framework, but a full ecosystem. Use [Bee UI](https://github.com/i-am-bee/bee-ui) to chat with your agents visually. [Bee Observe](https://github.com/i-am-bee/bee-observe) collects and manages telemetry. [Bee Code Interpreter](https://github.com/i-am-bee/bee-code-interpreter) runs generated code safely in a secure sandbox. The Bee ecosystem also integrates with [Model Context Protocol](https://i-am-bee.github.io/bee-agent-framework/#/tools?id=using-the-mcptool-class), allowing interoperability with the wider agent ecosystem!

## Quick example

This example demonstrates how to build a multi-agent workflow using Bee Agent Framework:

<!-- embedme examples/workflows/multiAgentsSimple.ts -->

```ts
import "dotenv/config";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { AgentWorkflow } from "bee-agent-framework/experimental/workflows/agent";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { GroqChatLLM } from "bee-agent-framework/adapters/groq/chat";

const workflow = new AgentWorkflow();

workflow.addAgent({
  name: "Researcher",
  instructions: "You are a researcher assistant. Respond only if you can provide a useful answer.",
  tools: [new WikipediaTool()],
  llm: new GroqChatLLM(),
});

workflow.addAgent({
  name: "WeatherForecaster",
  instructions: "You are a weather assistant. Respond only if you can provide a useful answer.",
  tools: [new OpenMeteoTool()],
  llm: new GroqChatLLM(),
  execution: { maxIterations: 3 },
});

workflow.addAgent({
  name: "Solver",
  instructions:
    "Your task is to provide the most useful final answer based on the assistants' responses which all are relevant. Ignore those where assistant do not know.",
  llm: new GroqChatLLM(),
});

const memory = new UnconstrainedMemory();

await memory.add(
  BaseMessage.of({
    role: Role.USER,
    text: "What is the capital of France and what is the current weather there?",
    meta: { createdAt: new Date() },
  }),
);

const { result } = await workflow.run(memory.messages).observe((emitter) => {
  emitter.on("success", (data) => {
    console.log(`-> ${data.step}`, data.response?.update?.finalAnswer ?? "-");
  });
});

console.log(`Agent 🤖`, result.finalAnswer);
```

## Getting started

> [!TIP]
>
> 🚀 Would you like a fully set-up TypeScript project with Bee, Code Interpreter, and Observability? Check out our [Bee Framework Starter](https://github.com/i-am-bee/bee-agent-framework-starter).

> [!TIP]
>
> 🚀 Would you like to work with Bee in your web browser? See [Bee Stack](https://github.com/i-am-bee/bee-stack)

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

➡️ See a more [advanced example](/examples/agents/bee.ts).

➡️ you can run this example after local installation, using the command `yarn start examples/agents/simple.ts`

> [!TIP]
>
> To run this example, be sure that you have installed [ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.

> [!TIP]
>
> Documentation is available at https://i-am-bee.github.io/bee-agent-framework/

### Local Installation

> [!NOTE]
>
> `yarn` should be installed via Corepack ([tutorial](https://yarnpkg.com/corepack))

1. Clone the repository `git clone git@github.com:i-am-bee/bee-agent-framework`.
2. Install dependencies `yarn install --immutable && yarn prepare`.
3. Create `.env` (from `.env.template`) and fill in missing values (if any).
4. Start the agent `yarn run start:bee` (it runs `/examples/agents/bee.ts` file).

➡️ All examples can be found in the [examples](/examples) directory.

➡️ To run an arbitrary example, use the following command `yarn start examples/agents/bee.ts` (just pass the appropriate path to the desired example).

### 📦 Modules

The source directory (`src`) provides numerous modules that one can use.

| Name                                             | Description                                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [**agents**](/docs/agents.md)                    | Base classes defining the common interface for agent.                                       |
| [**workflows**](/docs/workflows.md)              | Build agentic applications in a declarative way via [workflows](/docs/workflows.md).        |
| [**llms**](/docs/llms.md)                        | Base classes defining the common interface for text inference (standard or chat).           |
| [**template**](/docs/templates.md)               | Prompt Templating system based on `Mustache` with various improvements.                     |
| [**memory**](/docs/memory.md)                    | Various types of memories to use with agent.                                                |
| [**tools**](/docs/tools.md)                      | Tools that an agent can use.                                                                |
| [**cache**](/docs/cache.md)                      | Preset of different caching approaches that can be used together with tools.                |
| [**errors**](/docs/errors.md)                    | Error classes and helpers to catch errors fast.                                             |
| [**adapters**](/docs/llms.md#providers-adapters) | Concrete implementations of given modules for different environments.                       |
| [**logger**](/docs/logger.md)                    | Core component for logging all actions within the framework.                                |
| [**serializer**](/docs/serialization.md)         | Core component for the ability to serialize/deserialize modules into the serialized format. |
| [**version**](/docs/version.md)                  | Constants representing the framework (e.g., latest version)                                 |
| [**emitter**](/docs/emitter.md)                  | Bringing visibility to the system by emitting events.                                       |
| **internals**                                    | Modules used by other modules within the framework.                                         |

To see more in-depth explanation see [overview](/docs/overview.md).

## Tutorials

🚧 Coming soon 🚧

## Roadmap

- Bee agent performance optimization with additional models
- Examples, tutorials, and docs
- Improvements to building custom agents
- Multi-agent orchestration

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
  <img alt="Contributors list" src="https://contrib.rocks/image?repo=i-am-bee/bee-agent-framework" />
</a>
