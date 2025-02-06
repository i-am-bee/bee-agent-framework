# LLMs (inference)

> [!TIP]
>
> Location for concrete implementations within the framework `bee-agent-framework/adapters`.
>
> Location for base abstraction within the framework `bee-agent-framework/llms`.

A Large Language Model (LLM) is an AI designed to understand and generate human-like text.
Trained on extensive text data, LLMs learn language patterns, grammar, context, and basic reasoning to perform tasks like text completion, translation, summarization, and answering questions.

To unify differences between various APIs, the framework defines a common interface—a set of actions that can be performed with it.

## Providers (adapters)

| Name                                                                      | LLM                        | Chat LLM                                      | Structured output (constrained decoding) |
| ------------------------------------------------------------------------- | -------------------------- | --------------------------------------------- | ---------------------------------------- |
| `WatsonX`                                                                 | ✅                         | ⚠️ (model specific template must be provided) | ❌                                       |
| `Ollama`                                                                  | ✅                         | ✅                                            | ⚠️ (JSON only)                           |
| `OpenAI`                                                                  | ❌                         | ✅                                            | ⚠️ (JSON schema only)                    |
| `Azure OpenAI`                                                            | ❌                         | ✅                                            | ⚠️ (JSON schema only)                    |
| `LangChain`                                                               | ⚠️ (depends on a provider) | ⚠️ (depends on a provider)                    | ❌                                       |
| `Groq`                                                                    | ❌                         | ✅                                            | ⚠️ (JSON object only)                    |
| `AWS Bedrock`                                                             | ❌                         | ✅                                            | ⚠️ (JSON only) - model specific          |
| `VertexAI`                                                                | ✅                         | ✅                                            | ⚠️ (JSON only)                           |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                            |                                               |                                          |

All providers' examples can be found in [examples/llms/providers](/examples/llms/providers).

Are you interested in creating your own adapter? Jump to the [adding a new provider](#adding-a-new-provider-adapter) section.

## Usage

### Chat text generation

<!-- embedme examples/llms/chat.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "bee-agent-framework/backend/message";
import { Role } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm.create({
    messages: [
      Message.of({
        role: Role.USER,
        text: prompt,
      }),
    ],
  });
  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.messages));
}
```

_Source: [examples/llms/chat.ts](/examples/llms/chat.ts)_

#### Callback (Emitter)

<!-- embedme examples/llms/chatCallback.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { Message } from "bee-agent-framework/backend/message";
import { Role } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm
    .create({
      messages: [
        Message.of({
          role: Role.USER,
          text: prompt,
        }),
      ],
    })
    .observe((emitter) =>
      emitter.match("*", (data, event) => {
        reader.write(`LLM 🤖 (event: ${event.name})`, JSON.stringify(data));

        // if you want to close the stream prematurely, just uncomment the following line
        // callbacks.abort()
      }),
    );

  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.messages));
}
```

_Source: [examples/llms/chatCallback.ts](/examples/llms/chatCallback.ts)_

### Structured generation

<!-- embedme examples/llms/structured.ts -->

```ts
import "dotenv/config.js";
import { z } from "zod";
import { Message } from "bee-agent-framework/backend/message";
import { Role } from "bee-agent-framework/backend/message";
import { OllamaChatModel } from "bee-agent-framework/adapters/ollama/backend/chat";

const llm = new OllamaChatModel("llama3.1");
const response = await llm.createStructure({
  schema: z.union([
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      address: z.string(),
      age: z.number().int().min(1),
      hobby: z.string(),
    }),
    z.object({
      error: z.string(),
    }),
  ]),
  messages: [
    Message.of({
      role: Role.USER,
      text: "Generate a profile of a citizen of Europe.",
    }),
  ],
});
console.info(response);
```

_Source: [examples/llms/structured.ts](/examples/llms/structured.ts)_
