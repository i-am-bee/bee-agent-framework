# Bee Agent Framework Examples

This repository contains examples demonstrating the usage of the Bee Agent Framework, a toolkit for building AI agents and applications.

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

- [`bee.ts`](/examples/agents/bee.ts): Basic Bee Agent implementation
- [`bee_advanced.ts`](/examples/agents/bee_advanced.ts): Advanced Bee Agent with custom configurations
- [`bee_reusable.ts`](/examples/agents/bee_reusable.ts): Demonstration of serializing and reusing Bee Agents
- [`custom_agent.ts`](/examples/agents/custom_agent.ts): Example of creating a custom agent
- [`granite_bee.ts`](/examples/agents/granite/granite_bee.ts): Basic Bee Agent using an IBM Granite LLM
- [`granite_wiki_bee.ts`](/examples/agents/granite/granite_wiki_bee.ts): Advanced Bee Agent using an IBM Granite LLM with wikipedia retrieval
- [`simple.ts`](/examples/agents/simple.ts): Simple agent implementation
- [`sql.ts`](/examples/agents/sql.ts): Agent for SQL-related tasks

## Workflows

- [`simple.ts`](/examples/workflows/simple.ts): Introduction to workflows
- [`nesting.ts`](/examples/workflows/nesting.ts): How to nest workflows
- [`agent.ts`](/examples/workflows/agent.ts): Using workflows to interconnect two agents with a critique step.
- [`multiAgents.ts`](/examples/workflows/multiAgents.ts): Multi-step sequential agentic workflow.
- [`contentCreator.ts`](/examples/workflows/contentCreator.ts): Multi-step workflow for writing blog posts.

## Cache

- [`cacheFn.ts`](/examples/cache/cacheFn.ts): Function caching example
- [`custom.ts`](/examples/cache/custom.ts): Custom cache implementation
- [`decoratorCache.ts`](/examples/cache/decoratorCache.ts): Cache decorator usage
- [`decoratorCacheComplex.ts`](/examples/cache/decoratorCacheComplex.ts): Complex cache decorator example
- [`fileCache.ts`](/examples/cache/fileCache.ts): File-based caching
- [`fileCacheCustomProvider.ts`](/examples/cache/fileCacheCustomProvider.ts): Custom provider for file cache
- [`slidingCache.ts`](/examples/cache/slidingCache.ts): Sliding window cache implementation
- [`toolCache.ts`](/examples/cache/toolCache.ts): Caching for tools
- [`unconstrainedCache.ts`](/examples/cache/unconstrainedCache.ts): Unconstrained cache example
- [`unconstrainedCacheFunction.ts`](/examples/cache/unconstrainedCacheFunction.ts): Function using unconstrained cache

## Errors

- [`base.ts`](/examples/errors/base.ts): Basic error handling
- [`cast.ts`](/examples/errors/cast.ts): Error casting example
- [`tool.ts`](/examples/errors/tool.ts): Tool-specific error handling

## Helpers

- [`io.ts`](/examples/helpers/io.ts): Input/Output helpers
- [`setup.ts`](/examples/helpers/setup.ts): Setup utilities

## LLMs (Language Models)

- [`chat.ts`](/examples/backend/chat.ts): Chat-based language model usage
- [`chatCallback.ts`](/examples/backend/chatStream.ts): Callbacks for chat models
- [`structured.ts`](/examples/backend/structured.ts): Structured output from language models

### LLM Providers

- [`groq.ts`](/examples/backend/providers/groq.ts): Groq language model integration
- [`langchain.ts`](/examples/backend/providers/langchain.ts): LangChain integration
- [`ollama.ts`](/examples/backend/providers/ollama.ts): Ollama model usage
- [`openai.ts`](/examples/backend/providers/openai.ts): OpenAI integration
- [`watsonx.ts`](/examples/backend/providers/watsonx.ts): WatsonX integration

## Logger

- [`agent.ts`](/examples/logger/agent.ts): Agent-specific logging
- [`base.ts`](/examples/logger/base.ts): Basic logging setup
- [`pino.ts`](/examples/logger/pino.ts): Pino logger integration

## Memory

- [`agentMemory.ts`](/examples/memory/agentMemory.ts): Memory management for agents
- [`custom.ts`](/examples/memory/custom.ts): Custom memory implementation
- [`llmMemory.ts`](/examples/memory/llmMemory.ts): Memory for language models
- [`slidingMemory.ts`](/examples/memory/slidingMemory.ts): Sliding window memory
- [`summarizeMemory.ts`](/examples/memory/summarizeMemory.ts): Memory with summarization
- [`tokenMemory.ts`](/examples/memory/tokenMemory.ts): Token-based memory
- [`unconstrainedMemory.ts`](/examples/memory/unconstrainedMemory.ts): Unconstrained memory example

## Serialization

- [`base.ts`](/examples/serialization/base.ts): Basic serialization
- [`context.ts`](/examples/serialization/context.ts): Context serialization
- [`customExternal.ts`](/examples/serialization/customExternal.ts): Custom external serialization
- [`customInternal.ts`](/examples/serialization/customInternal.ts): Custom internal serialization
- [`memory.ts`](/examples/serialization/memory.ts): Memory serialization

## Templates

- [`arrays.ts`](/examples/templates/arrays.ts): Array-based templates
- [`forking.ts`](/examples/templates/forking.ts): Template forking
- [`functions.ts`](/examples/templates/functions.ts): Function-based templates
- [`objects.ts`](/examples/templates/objects.ts): Object-based templates
- [`primitives.ts`](/examples/templates/primitives.ts): Primitive data type templates

## Tools

- [`advanced.ts`](/examples/tools/advanced.ts): Advanced tool usage
- [`agent.ts`](/examples/tools/agent.ts): Agent-specific tools
- [`base.ts`](/examples/tools/base.ts): Basic tool implementation
- [`mcp.ts`](/examples/tools/mcp.ts): MCP tool usage

### Custom Tools

- [`base.ts`](/examples/tools/custom/base.ts): Custom tool base implementation
- [`dynamic.ts`](/examples/tools/custom/dynamic.ts): Dynamic tool creation
- [`openLibrary.ts`](/examples/tools/custom/openLibrary.ts): OpenLibrary API tool
- [`python.ts`](/examples/tools/custom/python.ts): Python-based custom tool

- [`langchain.ts`](/examples/tools/langchain.ts): LangChain tool integration

## Usage

To run these examples, make sure you have the Bee Agent Framework cloned and properly configured. Each file demonstrates a specific feature or use case of the framework. You can run individual examples using Node.js with TypeScript support.

1. Clone the repository:
   ```shell
   git clone git@github.com:i-am-bee/bee-agent-framework
   ```
2. Install dependencies:
   ```shell
   yarn install --immutable && yarn prepare
   ```
3. Create `.env` file (from `.env.template`) and fill in missing values (if any).

4. Run an arbitrary example, use the following command:

   ```shell
   yarn start examples/path/to/example.ts
   ```

For more detailed information on the Bee Agent Framework, please refer to the [documentation](/docs/README.md).

> [!TIP]
>
> To run examples that use Ollama, be sure that you have installed [Ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.
