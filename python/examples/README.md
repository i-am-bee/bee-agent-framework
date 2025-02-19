# BeeAI Framework Examples

This repository contains examples demonstrating the usage of the BeeAI Framework, a toolkit for building AI agents and applications.

## Table of Contents

1. [Agents](#agents)
2. [Workflows](#workflows)
3. [Cache](#cache)
4. [Errors](#errors)
5. [Helpers](#helpers)
6. [LLMs (Language Models)](#llms-language-models)
7. [Logger](#logger)
8. [Memory](#memory)
9. [Serialization](#serialization)
10. [Templates](#templates)
11. [Tools](#tools)

## Agents

- [`bee.py`](/examples/agents/bee.py): Basic Bee Agent implementation
- [`bee_advanced.py`](/examples/agents/bee_advanced.py): Advanced Bee Agent with custom configurations
- [`bee_reusable.py`](/examples/agents/bee_reusable.py): Demonstration of serializing and reusing Bee Agents
- [`custom_agent.py`](/examples/agents/custom_agent.py): Example of creating a custom agent
- [`granite_bee.py`](/examples/agents/granite/granite_bee.py): Basic Bee Agent using an IBM Granite LLM
- [`granite_wiki_bee.py`](/examples/agents/granite/granite_wiki_bee.py): Advanced Bee Agent using an IBM Granite LLM with wikipedia retrieval
- [`simple.py`](/examples/agents/simple.py): Simple agent implementation
- [`sql.py`](/examples/agents/sql.py): Agent for SQL-related tasks

## Workflows

- [`simple.py`](/examples/workflows/simple.py): Introduction to workflows
- [`nesting.py`](/examples/workflows/nesting.py): How to nest workflows
- [`agent.py`](/examples/workflows/agent.py): Using workflows to interconnect two agents with a critique step.
- [`multiAgents.py`](/examples/workflows/multiAgents.py): Multi-step sequential agentic workflow.
- [`contentCreator.py`](/examples/workflows/contentCreator.py): Multi-step workflow for writing blog posts.

## Cache

- [`cacheFn.py`](/examples/cache/cacheFn.py): Function caching example
- [`custom.py`](/examples/cache/custom.py): Custom cache implementation
- [`decoratorCache.py`](/examples/cache/decoratorCache.py): Cache decorator usage
- [`decoratorCacheComplex.py`](/examples/cache/decoratorCacheComplex.py): Complex cache decorator example
- [`fileCache.py`](/examples/cache/fileCache.py): File-based caching
- [`fileCacheCustomProvider.py`](/examples/cache/fileCacheCustomProvider.py): Custom provider for file cache
- [`slidingCache.py`](/examples/cache/slidingCache.py): Sliding window cache implementation
- [`toolCache.py`](/examples/cache/toolCache.py): Caching for tools
- [`unconstrainedCache.py`](/examples/cache/unconstrainedCache.py): Unconstrained cache example
- [`unconstrainedCacheFunction.py`](/examples/cache/unconstrainedCacheFunction.py): Function using unconstrained cache

## Errors

- [`base.py`](/examples/errors/base.py): Basic error handling
- [`cast.py`](/examples/errors/cast.py): Error casting example
- [`tool.py`](/examples/errors/tool.py): Tool-specific error handling

## Helpers

- [`io.py`](/examples/helpers/io.py): Input/Output helpers
- [`setup.py`](/examples/helpers/setup.py): Setup utilities

## LLMs (Language Models)

- [`chat.py`](/examples/backend/chat.py): Chat-based language model usage
- [`chatCallback.py`](/examples/backend/chatStream.py): Callbacks for chat models
- [`structured.py`](/examples/backend/structured.py): Structured output from language models

### LLM Providers

- [`ollama.py`](/examples/backend/providers/ollama.py): Ollama model usage
- [`watsonx.py`](/examples/backend/providers/watsonx.py): Watsonx integration

## Logger

- [`agent.py`](/examples/logger/agent.py): Agent-specific logging
- [`base.py`](/examples/logger/base.py): Basic logging setup
- [`pino.py`](/examples/logger/pino.py): Pino logger integration

## Memory

- [`agentMemory.py`](/examples/memory/agentMemory.py): Memory management for agents
- [`custom.py`](/examples/memory/custom.py): Custom memory implementation
- [`llmMemory.py`](/examples/memory/llmMemory.py): Memory for language models
- [`slidingMemory.py`](/examples/memory/slidingMemory.py): Sliding window memory
- [`summarizeMemory.py`](/examples/memory/summarizeMemory.py): Memory with summarization
- [`tokenMemory.py`](/examples/memory/tokenMemory.py): Token-based memory
- [`unconstrainedMemory.py`](/examples/memory/unconstrainedMemory.py): Unconstrained memory example

## Serialization

- [`base.py`](/examples/serialization/base.py): Basic serialization
- [`context.py`](/examples/serialization/context.py): Context serialization
- [`customExternal.py`](/examples/serialization/customExternal.py): Custom external serialization
- [`customInternal.py`](/examples/serialization/customInternal.py): Custom internal serialization
- [`memory.py`](/examples/serialization/memory.py): Memory serialization

## Templates

- [`arrays.py`](/examples/templates/arrays.py): Array-based templates
- [`forking.py`](/examples/templates/forking.py): Template forking
- [`functions.py`](/examples/templates/functions.py): Function-based templates
- [`objects.py`](/examples/templates/objects.py): Object-based templates
- [`primitives.py`](/examples/templates/primitives.py): Primitive data type templates

## Tools

- [`advanced.py`](/examples/tools/advanced.py): Advanced tool usage
- [`agent.py`](/examples/tools/agent.py): Agent-specific tools
- [`base.py`](/examples/tools/base.py): Basic tool implementation
- [`mcp.py`](/examples/tools/mcp.py): MCP tool usage

### Custom Tools

- [`base.py`](/examples/tools/custom/base.py): Custom tool base implementation
- [`dynamic.py`](/examples/tools/custom/dynamic.py): Dynamic tool creation
- [`openLibrary.py`](/examples/tools/custom/openLibrary.py): OpenLibrary API tool
- [`python.py`](/examples/tools/custom/python.py): Python-based custom tool

- [`langchain.py`](/examples/tools/langchain.py): LangChain tool integration

## Usage

To run these examples, make sure you have the BeeAI Framework cloned and properly configured. Each file demonstrates a specific feature or use case of the framework. You can run individual examples using Python.

1. Clone the repository:
   ```bash
   git clone git@github.com:i-am-bee/beeai-framework
   ```
2. Install dependencies:
   ```bash
   pip install .
   ```
3. Create `.env` file (from `.env.template`) and fill in missing values (if any).

4. Run an arbitrary example, use the following command:

   ```bash
   python examples/path/to/example.py
   ```

For more detailed information on the BeeAI Framework, please refer to the [documentation](/docs/README.md).

> [!TIP]
>
> To run examples that use Ollama, be sure that you have installed [Ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.
