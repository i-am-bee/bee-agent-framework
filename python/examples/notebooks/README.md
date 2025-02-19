# BeeAI Python Notebook Examples

These examples organize agentic topics from the BeeAI framework for Python into structured groups, making it easier to learn the framework.

## Pre-requisites

We do not assume any particular method/software for executing these notebooks. The minimum requirements are contained within the `requirements.txt` files. These can be installed after activating your Python virtual environment, as follows:

```shell
pip install -r examples/requirements.txt
pip install -r examples/notebooks/requirements.txt
```

> [!NOTE]
> You can find out how to activate your Python virtual environment in the main [README](/README.md) of this repository.

If you're not familiar with how to get started with Jupyter Notebooks you can read the [documentation](https://docs.jupyter.org). As a quick start, you can try using Jupyter Lab, as follows:

```shell
pip install jupyterlab
jupyter-lab examples/notebooks/basic.ipynb
```

## Notebooks

The basics notebook introduces the core constructs provided by the BeeAI framework such as PromptTemplates, Messages, Memory and how to setup and generate output using a ChatModel.

[basics.ipynb](basics.ipynb)

The workflows notebook describes how to use BeeAI Workflows to build AI agents of various complexities. This notebook builds on topics discussed in the [basics.ipynb](basics.ipynb).

[workflows.ipynb](workflows.ipynb)

Finally the agents notebook describes how to setup and use the BeeAI ReActAgent. This is a pre canned ReAct agent that can be configured with tools, and instructions to solve problems.

[agents.ipynb](agents.ipynb)
