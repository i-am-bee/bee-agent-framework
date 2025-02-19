> [!WARNING]
> PRE-Alpha! Please reach out if you want to get involved in the discussions. All feedback is welcomed

<p align="center">
    <img alt="BeeAI Framework logo" src="/docs/assets/Bee_Dark.svg" height="128">
    <h1 align="center">BeeAI Agent Framework for Python</h1>
</p>

<p align="center">
  <img align="center" alt="Project Status: Alpha" src="https://img.shields.io/badge/Status-Alpha-red">
  <h4 align="center">Python implementation of the BeeAI Agent Framework for building, deploying, and serving powerful agentic workflows at scale.</h4>
</p>

The BeeAI Agent Framework for Python makes it easy to build scalable agent-based workflows with your model of choice. This framework is designed to perform robustly with [IBM Granite](https://www.ibm.com/granite?adoper=255252_0_LS1) and [Llama 3.x](https://ai.meta.com/blog/meta-llama-3-1/) models. Varying level of support is currently available for [other LLMs using LiteLLM](https://docs.litellm.ai/docs/providers). We're actively working on optimizing its performance with these popular LLMs.

Our goal is to empower Python developers to adopt the latest open-source and proprietary models with minimal changes to their current agent implementation.

## Key Features

- 🤖 **AI agents**: Use our powerful BeeAI agent refined for Llama 3.x and Granite 3.x, or build your own.
- 🛠️ **Tools**: Use our built-in tools or create your own in Python.
- 💾 **Memory**: Multiple strategies to optimize token spend.
- ... more on our Roadmap

## Getting Started

### Installation

```bash
pip install beeai-framework
```

### Quick Example

```py
import asyncio

from beeai_framework.agents.bee.agent import BeeAgent
from beeai_framework.agents.types import BeeInput, BeeRunInput, BeeRunOutput
from beeai_framework.backend.chat import ChatModel
from beeai_framework.memory.unconstrained_memory import UnconstrainedMemory
from beeai_framework.tools.weather.openmeteo import OpenMeteoTool

async def main() -> None:
    llm = await ChatModel.from_name("ollama:granite3.1-dense:8b")
    agent = BeeAgent(bee_input=BeeInput(llm=llm, tools=[OpenMeteoTool()], memory=UnconstrainedMemory()))
    result: BeeRunOutput = await agent.run(run_input=BeeRunInput(prompt="How is the weather in White Plains?"))
    print(result.result.text)

if __name__ == "__main__":
    asyncio.run(main())
```

> [!NOTE]
> To run this example, ensure you have [ollama](https://ollama.com) installed with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.

to run other examples you can use, "python -m examples/beeai/[example_name]":

```bash
python examples/basic.py
```

## Local Development

Please check our [contributing guide](./CONTRIBUTING.md)

### Prerequisites

For development, there are some tools you will need prior cloning the code.

#### Poetry

[Poetry](https://python-poetry.org/) is a tool for Python packaging, dependency and virtual environment management that is used to manage the development of this project. Verify version 2 is installed on your machine. There are several ways to install it including through the package manager of your operating system, however, the easiest way to install is using the official installer, as follows:

```bash
curl -sSL https://install.python-poetry.org | python3 -
```

You can also use `pip` and `pipx` to install poetry.

Once you have Poetry installed, you will also need to add the poetry shell plugin:

```bash
poetry self add poetry-plugin-shell
```

> [!IMPORTANT]
> You must have poetry >= 2.0 installed

### Clone and set up the code

Follow these steps:

```bash
# Clone the repository
git clone https://github.com/i-am-bee/beeai-framework

cd python

# Use Poetry to install the project dependencies and activate a virtual environment
poetry install
poetry shell

# Copy .env.example to .env and fill in required values
cp .env.example .env
```

### Build the pip package

#### Build the package:

```bash
poetry build
```

## Modules

The package provides several modules:

| Module   | Description                                           |
| -------- | ----------------------------------------------------- |
| `agents` | Base classes defining the common interface for agents |
| `llms`   | Base classes for text inference (standard or chat)    |
| `tools`  | Tools that an agent can use                           |

## Roadmap

- 👩‍💻 **Code interpreter**: Run code safely in a sandbox container.
- ⏸️ **Serialization**: Handle complex agentic workflows and easily pause/resume them without losing state.
- 🔍 **Instrumentation**: Full visibility of your agent's inner workings.
- 🎛️ **Production-level** control with caching and error handling.
- 🔁 **API**: OpenAI-compatible Assistants API integration.
- BeeAI agent performance optimization with additional models
- Examples, tutorials, and comprehensive documentation
- Improvements to building custom agents
- Multi-agent orchestration
- Feature parity with TypeScript version

## Contributing

The BeeAI Agent Framework for Python is an open-source project and we ❤️ contributions. Please check our [contribution guidelines](./CONTRIBUTING.md) before getting started.

### Reporting Issues

We use [GitHub Issues](https://github.com/i-am-bee/beeai-framework/issues) to track public bugs. Please check existing issues before filing new ones.

### Code of Conduct

This project adheres to our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Legal Notice

Initial content in these repositories including code has been provided by IBM under the associated open source software license and IBM is under no obligation to provide enhancements, updates, or support. IBM developers produced this code as an open source project (not as an IBM product), and IBM makes no assertions as to the level of quality nor security, and will not be maintaining this code going forward.
