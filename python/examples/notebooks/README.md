<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/docs/assets/Bee_logo_white.svg">
    <source media="(prefers-color-scheme: light)" srcset="/docs/assets/Bee_logo_black.svg">
    <img alt="Bee Framework logo" height="90">
  </picture>
</p>

<h1 align="center">BeeAI Framework Notebooks</h1>

This series of notebooks will guide you through the features of the BeeAI framework. You'll learn how to create, manage, and optimize AI agents with the help of practical examples and explanations.

## 🛠 Setup

First clone the beeai-framework repo. 

```shell
git clone git@github.com:i-am-bee/beeai-framework.git
```

Then, navigate to the example notebooks in the python subfolder:

```shell
cd beeai-framework/python/examples/notebooks
```

You will need Python 3.11 or above. This can be checked with:

```shell
python --version
```

> [!NOTE] 
> See the [Python documentation](https://www.python.org/) for further information on installing or upgrading.

❗❗It is recommended to run the notebooks within a virtual environment. You can create one using the following commands:

```shell
python -m venv .venv
```

Ensure the Python environment is activated in each new terminal window:

```shell
source .venv/bin/activate
```

📦 You are now ready to install dependencies:

```shell
pip install -r requirements.txt
```

✨ You are now ready to spin up the first notebook ✨

```shell
jupyter-lab basics.ipynb --port 9999
```

> [!NOTE]
> If you're not familiar with how to get started with Jupyter Notebooks you can read the [documentation](https://docs.jupyter.org). 

## Notebooks

There are three notebooks available. It is recommended to start with [basics.ipynb](basics.ipynb), followed by [workflows.ipynb](workflows.ipynb), and finally [agents.ipynb](agents.ipynb). You can navigate through the notebooks using the embedded links.

The [basics.ipynb](basics.ipynb) notebook introduces the core components of the BeeAI framework, including PromptTemplates, Messages, and Memory. It also covers setting up a ChatModel and generating output.

The [workflows.ipynb](workflows.ipynb) notebook explains how to use BeeAI Workflows to create AI agents of varying complexity. It builds upon the concepts introduced in [basics.ipynb](basics.ipynb).

Finally, the [agents.ipynb](agents.ipynb) notebook covers setting up and using the BeeAI ReActAgent. This pre-configured ReAct agent can be customized with tools and instructions to solve various problems.

