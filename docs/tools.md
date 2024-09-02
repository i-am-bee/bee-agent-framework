# Tools

## Introduction

Tools in the context of an agent refer to additional functionalities or capabilities integrated with the agent to perform specific tasks beyond text processing. These tools extend the agent's abilities, allowing it to interact with external systems, access information, and execute actions.

## Development

### Writing a new tool

To create a tool, the `Tool` class must be extended/ implemented or `DynamicTool` created from [tools base](../src/tools/base.ts). When starting to write tools, it is recommended to implement the `Tool` class. The `DynamicTool` class is an extension of the `Tool` class that allows for dynamic forms of input. Refer to the list of [examples](#examples) for some simple examples or any of the built-in tools in order to guide the creation of new tools.

Tools MUST do the following:

- Implement the `Tool` class:

  `MyNewToolOutput` is required, must be an implementation of `ToolOutput` such as `StringToolOutput` or `JSONToolOutput`

  `ToolOptions` is optional (default BaseToolOptions), constructor parameters that are passed during tool creation

  `ToolRunOptions` is optional (default BaseToolRunOptions), optional parameters that are passed to the run method

  ```typescript
  import { BaseToolOptions, BaseToolRunOptions } from "bee-agent-framework/tools/base";

  type ToolOptions = BaseToolOptions;
  type ToolRunOptions = BaseToolRunOptions;

  export class MyNewTool extends Tool<MyNewToolOutput, ToolOptions, ToolRunOptions> {
    // tool implementation
  }
  ```

- Be given a unique name:

  Note: Convention and best practice is to set the tool's name to the name of its class

  ```typescript
  name = "MyNewTool";
  ```

- Provide a natural language description of what the tool does:

  ❗Important: this description is used by the agent to determine when the tool should be used. It's probably the most important aspect of your tool and you should experiment with different natural language descriptions to ensure the tool is used in the correct circumstances.

  ```typescript
  description = "Takes X action when given Y input resulting in Z output";
  ```

- Declare an input schema:

  This is used to define the format of the input to your tool. The agent will formalise the natural language input(s) it has received and structure them into the fields described in the tool's input. The input schema can be specified using [Zod](https://github.com/colinhacks/zod) (recommended) or JSONSchema. It must be a function (either sync or async). Zod effects (e.g. `z.object().transform(...)`) are not supported. The return value of `inputSchema` must always be an object and pass validation by the `validateSchema()` function defined in [schema.ts](../src/internals/helpers/schema.ts).

  <!-- eslint-skip -->

  ```typescript
  inputSchema() {
      // any Zod definition is good here, this is typical simple example
      return z.object({
        // list of key-value pairs
      });
  }
  ```

- Implement initialisation:

  The unnamed static block is executed when your tool is called for the first time. It is used for registering your tool as `serializable` to the agent and any other custom initialisation that may be required.

  <!-- eslint-skip -->

  ```typescript
  static {
      this.register();
  }
  ```

- Implement the `_run()` method:

  <!-- eslint-skip -->

  ```typescript
  protected async _run(input: ToolInput<this>, options?: BaseToolRunOptions) {
      // insert custom code here
      // MUST: return an instance of the output type specified in the tool class definition
      // MAY: throw an instance of ToolError upon unrecoverable error conditions encountered by the tool
  }
  ```

### Using tools with agents

In order for a tool to be of some utility within an agent, you must enable the agent with knowledge of the tool. To do this, the tool code module must be imported into the agent and passed to the tools array during creation of a `BeeAgent`. An example can be found in the [bee agent](../examples/agents/bee.ts) or you can use a code snippet such as the one below that creates an agent with the built-in [ArXiv tool](../src/tools/arxiv.ts):

```typescript
import { ArXivTool } from "bee-agent-framework/tools/arxiv";

const llm = new OllamaChatLLM({
  modelId: "insert-model-id-here",
});

const agent = new BeeAgent({
  llm,
  memory: new TokenMemory({ llm }),
  tools: [new ArXivTool()],
});
```

## Examples

### Hello World

The simplest form of an example tool is the [helloworld](../examples/tools/helloWorld.ts) tool. This example implements the Tool class and will simply prepend the word "Hello" to a given input such as "Please give a special greeting to Bee!". It is not intended for usage with any agents since the functionality provided is highly trivial. However, it may serve as a starter template for writing new tools.

### Open Library

The [openlibrary](../examples/tools/openLibrary.ts) tool allows an agent to query the [Open Library](https://openlibrary.org/) via its [book search API](https://openlibrary.org/dev/docs/api/search). This functionality injects knowledge about book metadata (not book content) into an agent. It serves as an example for several key aspects of tool creation:

- Implementing the `Tool` class
- Specifying the input schema to a tool
- Calling out to a third-party service and handling responses and errors
- Using `JSONToolOutput` to return JSON formatted data to the agent
