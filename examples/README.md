# Bee Agent Framework Examples

This repository contains examples demonstrating the usage of the Bee Agent Framework, a toolkit for building AI agents and applications.

## Table of Contents

1. [Agents](#agents)
2. [Cache](#cache)
3. [Errors](#errors)
4. [Helpers](#helpers)
5. [LLMs (Language Models)](#llms-language-models)
6. [Logger](#logger)
7. [Memory](#memory)
8. [Serialization](#serialization)
9. [Templates](#templates)
10. [Tools](#tools)

## Agents

- [`bee.ts`](agents/bee.ts): Basic Bee Agent implementation
- [`bee_advanced.ts`](agents/bee_advanced.ts): Advanced Bee Agent with custom configurations
- [`bee_reusable.ts`](agents/bee_reusable.ts): Demonstration of serializing and reusing Bee Agents
- [`custom_agent.ts`](agents/custom_agent.ts): Example of creating a custom agent
- [`granite_bee.ts`](agents/granite/granite_bee.ts): Basic Bee Agent using an IBM Granite LLM
- [`granite_wiki_bee.ts`](agents/granite/granite_wiki_bee.ts): Advanced Bee Agent using an IBM Granite LLM with wikipedia retrieval
- [`simple.ts`](agents/simple.ts): Simple agent implementation
- [`sql.ts`](agents/sql.ts): Agent for SQL-related tasks

## Cache

- [`cacheFn.ts`](cache/cacheFn.ts): Function caching example
- [`custom.ts`](cache/custom.ts): Custom cache implementation
- [`decoratorCache.ts`](cache/decoratorCache.ts): Cache decorator usage
- [`decoratorCacheComplex.ts`](cache/decoratorCacheComplex.ts): Complex cache decorator example
- [`fileCache.ts`](cache/fileCache.ts): File-based caching
- [`fileCacheCustomProvider.ts`](cache/fileCacheCustomProvider.ts): Custom provider for file cache
- [`llmCache.ts`](cache/llmCache.ts): Caching for language models
- [`slidingCache.ts`](cache/slidingCache.ts): Sliding window cache implementation
- [`toolCache.ts`](cache/toolCache.ts): Caching for tools
- [`unconstrainedCache.ts`](cache/unconstrainedCache.ts): Unconstrained cache example
- [`unconstrainedCacheFunction.ts`](cache/unconstrainedCacheFunction.ts): Function using unconstrained cache

## Errors

- [`base.ts`](errors/base.ts): Basic error handling
- [`cast.ts`](errors/cast.ts): Error casting example
- [`tool.ts`](errors/tool.ts): Tool-specific error handling

## Helpers

- [`io.ts`](helpers/io.ts): Input/Output helpers
- [`setup.ts`](helpers/setup.ts): Setup utilities

## LLMs (Language Models)

- [`chat.ts`](llms/chat.ts): Chat-based language model usage
- [`chatCallback.ts`](llms/chatCallback.ts): Callbacks for chat models
- [`chatStream.ts`](llms/chatStream.ts): Streaming with chat models
- [`structured.ts`](llms/structured.ts): Structured output from language models
- [`text.ts`](llms/text.ts): Text-based language model usage

### LLM Providers

- [`bam.ts`](llms/providers/bam.ts): BAM language model integration
- [`bam_verbose.ts`](llms/providers/bam_verbose.ts): Verbose BAM model usage
- [`customChatProvider.ts`](llms/providers/customChatProvider.ts): Custom chat provider implementation
- [`customProvider.ts`](llms/providers/customProvider.ts): Custom language model provider
- [`groq.ts`](llms/providers/groq.ts): Groq language model integration
- [`ibm-vllm.ts`](llms/providers/ibm-vllm.ts): IBM vLLM integration
- [`langchain.ts`](llms/providers/langchain.ts): LangChain integration
- [`ollama.ts`](llms/providers/ollama.ts): Ollama model usage
- [`openai.ts`](llms/providers/openai.ts): OpenAI integration
- [`watsonx.ts`](llms/providers/watsonx.ts): WatsonX integration
- [`watsonx_verbose.ts`](llms/providers/watsonx_verbose.ts): Verbose WatsonX usage

## Logger

- [`agent.ts`](logger/agent.ts): Agent-specific logging
- [`base.ts`](logger/base.ts): Basic logging setup
- [`pino.ts`](logger/pino.ts): Pino logger integration

## Memory

- [`agentMemory.ts`](memory/agentMemory.ts): Memory management for agents
- [`custom.ts`](memory/custom.ts): Custom memory implementation
- [`llmMemory.ts`](memory/llmMemory.ts): Memory for language models
- [`slidingMemory.ts`](memory/slidingMemory.ts): Sliding window memory
- [`summarizeMemory.ts`](memory/summarizeMemory.ts): Memory with summarization
- [`tokenMemory.ts`](memory/tokenMemory.ts): Token-based memory
- [`unconstrainedMemory.ts`](memory/unconstrainedMemory.ts): Unconstrained memory example

## Serialization

- [`base.ts`](serialization/base.ts): Basic serialization
- [`context.ts`](serialization/context.ts): Context serialization
- [`customExternal.ts`](serialization/customExternal.ts): Custom external serialization
- [`customInternal.ts`](serialization/customInternal.ts): Custom internal serialization
- [`memory.ts`](serialization/memory.ts): Memory serialization

## Templates

- [`arrays.ts`](templates/arrays.ts): Array-based templates
- [`forking.ts`](templates/forking.ts): Template forking
- [`functions.ts`](templates/functions.ts): Function-based templates
- [`objects.ts`](templates/objects.ts): Object-based templates
- [`primitives.ts`](templates/primitives.ts): Primitive data type templates

## Tools

- [`advanced.ts`](tools/advanced.ts): Advanced tool usage
- [`agent.ts`](tools/agent.ts): Agent-specific tools
- [`base.ts`](tools/base.ts): Basic tool implementation

### Custom Tools

- [`base.ts`](tools/custom/base.ts): Custom tool base implementation
- [`dynamic.ts`](tools/custom/dynamic.ts): Dynamic tool creation
- [`openLibrary.ts`](tools/custom/openLibrary.ts): OpenLibrary API tool
- [`python.ts`](tools/custom/python.ts): Python-based custom tool

- [`langchain.ts`](tools/langchain.ts): LangChain tool integration

## Additional Files

- [`tsconfig.json`](tsconfig.json): TypeScript configuration
- [`version.ts`](version.ts): Framework version information

## Usage

To run these examples, make sure you have the Bee Agent Framework cloned and properly configured. Each file demonstrates a specific feature or use case of the framework. You can run individual examples using Node.js with TypeScript support.

1. Clone the repository:
   ```
   git clone git@github.com:i-am-bee/bee-agent-framework
   ```
2. Install dependencies:
   ```
   yarn install --immutable && yarn prepare
   ```
3. Create `.env` file (from `.env.template`) and fill in missing values (if any).

4. Run an arbitrary example, use the following command:

   ```
   yarn start examples/path/to/example.ts
   ```

For more detailed information on the Bee Agent Framework, please refer to the [documentation](../docs/README.md).

> [!TIP]
>
> To run examples that use Ollama, be sure that you have installed [Ollama](https://ollama.com) with the [llama3.1](https://ollama.com/library/llama3.1) model downloaded.
