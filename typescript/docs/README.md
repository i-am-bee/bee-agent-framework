<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/docs/assets/Bee_logo_white.svg">
    <source media="(prefers-color-scheme: light)" srcset="/docs/assets/Bee_logo_black.svg">
    <img alt="Bee Framework logo" height="90">
  </picture>
</p>

<h1 align="center">BeeAI Framework for TypeScript</h1>

<p align="center">
  <img align="center" alt="Project Status: Beta" src="https://img.shields.io/badge/Status-Beta-blue">
  <h4 align="center">BeeAI Framework is an open-source library for building production-ready multi-agent systems.</h4>
</p>

## Latest updates

- 🚀 **2025-02-19**: Launched an alpha of the Python library and rebranded to BeeAI Framework. See our [getting started guide](/python/docs/README.md).
- 🚀 **2025-02-07**: Introduced [Backend](/typescript/docs/backend.md) module to simplify working with AI services (chat, embedding). See our [migration guide](/typescript/docs/migration_guide.md).
- 🧠 **2025-01-28**: Added support for [DeepSeek R1](https://api-docs.deepseek.com/news/news250120), check out the [Competitive Analysis Workflow example](/typescript/examples/workflows/competitive-analysis)
- 🚀 **2025-01-09**:
  - Introduced [Workflows](/typescript/docs/workflows.md), a way of building multi-agent systems.
  - Added support for [Model Context Protocol](https://i-am-bee.github.io/bee-agent-framework/#/tools?id=using-the-mcptool-class), featured on the [official page](https://modelcontextprotocol.io/clients#bee-agent-framework).
- 🚀 **2024-12-09**: Added support for [LLaMa 3.3](https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct).
- 🚀 **2024-11-21**: Added an experimental [Streamlit agent](typescript/examples/agents/experimental/streamlit.ts).

For a full changelog, see our [releases page](https://github.com/i-am-bee/beeai-framework/releases).

## Why pick BeeAI?

**🏆 Build the optimal agent architecture for your use case.** To design the right architecture for your use case, you need flexibility in both orchestrating agents and defining their roles and behaviors. With the BeeAI framework, you can implement any multi-agent pattern using [Workflows](/typescript/docs/workflows.md). Start with our out-of-the-box [ReActAgent](/typescript/examples/agents/bee.ts), or easily [customize your own agent](/typescript/docs/agents.md#creating-your-own-agent).

**🚀 Scale effortlessly with production-grade controls.** Deploying multi-agent systems requires efficient resource management and reliability. With the BeeAI framework, you can optimize token usage through [memory strategies](/typescript/docs/memory.md), persist and restore agent state via  [(de)serialization](/typescript/docs/serialization.md), generate [structured outputs](typescript/examples/backend/structured.ts), and execute generated code in a sandboxed environment. When things go wrong, BeeAI helps you track the full agent workflow through [events](/typescript/docs/emitter.md), collect [telemetry](/typescript/docs/instrumentation.md), log diagnostic data, and handle errors with clear, well-defined [exceptions](/typescript/docs/errors.md).

**🔌 Seamlessly integrate with your models and tools.** Get started with any model from [Ollama](/typescript/examples/backend/providers/ollama.ts), [Groq](/typescript/examples/backend/providers/groq.ts), [OpenAI](/typescript/examples/backend/providers/openai.ts), [watsonx.ai](/typescript/examples/backend/providers/watsonx.ts), and [more](/typescript/docs/backend.md). Leverage tools from [LangChain](https://python.langchain.com/docs/integrations/tools/), connect to any server using the [Model Context Protocol](/typescript/docs/tools.md#using-the-mcptool-class), or build your own [custom tools](/typescript/docs/tools.md#using-the-customtool-python-functions). BeeAI is designed for extensibility, allowing you to integrate with the systems and capabilities you need.

## Modules

The source directory (`src`) provides numerous modules that one can use.

| Name                                        | Description                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [**agents**](./agents.md)                   | Base classes defining the common interface for agent.                                       |
| [**backend**](/docs/backend.md)             | Functionalities that relates to AI models (chat, embedding, image, tool calling, ...)       |
| [**template**](./templates.md)              | Prompt Templating system based on `Mustache` with various improvements.                     |
| [**memory**](./memory.md)                   | Various types of memories to use with agent.                                                |
| [**tools**](./tools.md)                     | Tools that an agent can use.                                                                |
| [**cache**](./cache.md)                     | Preset of different caching approaches that can be used together with tools.                |
| [**errors**](./errors.md)                   | Base framework error classes used by each module.                                           |
| [**logger**](./logger.md)                   | Core component for logging all actions within the framework.                                |
| [**serializer**](./serialization.md)        | Core component for the ability to serialize/deserialize modules into the serialized format. |
| [**version**](./version.md)                 | Constants representing the framework (e.g., the latest version)                             |
| [**emitter**](./emitter.md)                 | Bringing visibility to the system by emitting events.                                       |
| [**instrumentation**](./instrumentation.md) | Integrate monitoring tools into your application.                                           |
| **internals**                               | Modules used by other modules within the framework.                                         |

## Installation

To install the TypeScript library:
```shell
npm install beeai-framework
```

or

```shell
yarn add beeai-framework
```

## Quick example

The following example demonstrates how to build a multi-agent workflow using the BeeAI Framework:

<!-- embedme examples/workflows/multiAgentsSimple.ts -->

```ts
import "dotenv/config";
import { UnconstrainedMemory } from "beeai-framework/memory/unconstrainedMemory";
import { OpenMeteoTool } from "beeai-framework/tools/weather/openMeteo";
import { WikipediaTool } from "beeai-framework/tools/search/wikipedia";
import { AgentWorkflow } from "beeai-framework/experimental/workflows/agent";
import { Message, Role } from "beeai-framework/llms/primitives/message";
import { GroqChatLLM } from "beeai-framework/adapters/groq/chat";

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
  Message.of({
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

Once you've installed the BeeAI Framework locally, you can run this example using either yarn or npm:

Using yarn:
```shell
yarn start examples/agents/simple.ts
```

Using npm:
```shell
npm run start examples/agents/simple.ts
```

> [!TIP]
>
> To run this example, be sure that you have installed [ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.

➡️ Explore all examples in our [examples library](/examples).

## Roadmap

- Python parity with TypeScript
- Standalone docs site
- Integration with watsonx.ai for deployment
- More multi-agent reference architecture implementations using workflows
- More OTTB agent implementations
- Native tool calling with supported LLM providers

To stay up-to-date with out latest priorities, check out our [public roadmap](https://github.com/orgs/i-am-bee/projects/1/views/2).

## Contribution guidelines

The BeeAI Framework is an open-source project and we ❤️ contributions.<br>

If you'd like to help build BeeAI, take a look at our [contribution guidelines](/python/docs/CONTRIBUTING.md).

## Bugs

We are using GitHub Issues to manage public bugs. We keep a close eye on this, so before filing a new issue, please check to make sure it hasn't already been logged.

## Code of conduct

This project and everyone participating in it are governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please read the [full text](./CODE_OF_CONDUCT.md) so that you can read which actions may or may not be tolerated.

## Legal notice

All content in these repositories including code has been provided by IBM under the associated open source software license and IBM is under no obligation to provide enhancements, updates, or support. IBM developers produced this code as an open source project (not as an IBM product), and IBM makes no assertions as to the level of quality nor security, and will not be maintaining this code going forward.

## Contributors

Special thanks to our contributors for helping us improve the BeeAI Framework.

<a href="https://github.com/i-am-bee/beeai-framework/graphs/contributors">
  <img alt="Contributors list" src="https://contrib.rocks/image?repo=i-am-bee/beeai-framework" />
</a>
