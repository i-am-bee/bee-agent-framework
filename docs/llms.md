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
| `BAM (Internal)`                                                          | ✅                         | ⚠️ (model specific template must be provided) | ✅                                       |
| ➕ [Request](https://github.com/i-am-bee/bee-agent-framework/discussions) |                            |                                               |                                          |

All providers' examples can be found in [examples/llms/providers](/examples/llms/providers).

Are you interested in creating your own adapter? Jump to the [adding a new provider](#adding-a-new-provider-adapter) section.

## Usage

### Plain text generation

<!-- embedme examples/llms/text.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { WatsonXLLM } from "bee-agent-framework/adapters/watsonx/llm";

const llm = new WatsonXLLM({
  modelId: "google/flan-ul2",
  projectId: process.env.WATSONX_PROJECT_ID,
  apiKey: process.env.WATSONX_API_KEY,
  region: process.env.WATSONX_REGION, // (optional) default is us-south
  parameters: {
    decoding_method: "greedy",
    max_new_tokens: 50,
  },
});

const reader = createConsoleReader();
const prompt = await reader.prompt();
const response = await llm.generate(prompt);
reader.write(`LLM 🤖 (text) : `, response.getTextContent());
reader.close();
```

_Source: [examples/llms/text.ts](/examples/llms/text.ts)_

> [!NOTE]
>
> The `generate` method returns a class that extends the base [`BaseLLMOutput`](/src/llms/base.ts) class.
> This class allows you to retrieve the response as text using the `getTextContent` method and other useful metadata.

> [!TIP]
>
> You can enable streaming communication (internally) by passing `{ stream: true }` as a second parameter to the `generate` method.

### Chat text generation

<!-- embedme examples/llms/chat.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const llm = new OllamaChatLLM();

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm.generate([
    BaseMessage.of({
      role: Role.USER,
      text: prompt,
    }),
  ]);
  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.finalResult));
}
```

_Source: [examples/llms/chat.ts](/examples/llms/chat.ts)_

> [!NOTE]
>
> The `generate` method returns a class that extends the base [`ChatLLMOutput`](/src/llms/chat.ts) class.
> This class allows you to retrieve the response as text using the `getTextContent` method and other useful metadata.
> To retrieve all messages (chunks) access the `messages` property (getter).

> [!TIP]
>
> You can enable streaming communication (internally) by passing `{ stream: true }` as a second parameter to the `generate` method.

#### Streaming

<!-- embedme examples/llms/chatStream.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const llm = new OllamaChatLLM();

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  for await (const chunk of llm.stream([
    BaseMessage.of({
      role: Role.USER,
      text: prompt,
    }),
  ])) {
    reader.write(`LLM 🤖 (txt) : `, chunk.getTextContent());
    reader.write(`LLM 🤖 (raw) : `, JSON.stringify(chunk.finalResult));
  }
}
```

_Source: [examples/llms/chatStream.ts](/examples/llms/chatStream.ts)_

#### Callback (Emitter)

<!-- embedme examples/llms/chatCallback.ts -->

```ts
import "dotenv/config.js";
import { createConsoleReader } from "examples/helpers/io.js";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";

const llm = new OllamaChatLLM();

const reader = createConsoleReader();

for await (const { prompt } of reader) {
  const response = await llm
    .generate(
      [
        BaseMessage.of({
          role: Role.USER,
          text: prompt,
        }),
      ],
      {},
    )
    .observe((emitter) =>
      emitter.match("*", (data, event) => {
        reader.write(`LLM 🤖 (event: ${event.name})`, JSON.stringify(data));

        // if you want to close the stream prematurely, just uncomment the following line
        // callbacks.abort()
      }),
    );

  reader.write(`LLM 🤖 (txt) : `, response.getTextContent());
  reader.write(`LLM 🤖 (raw) : `, JSON.stringify(response.finalResult));
}
```

_Source: [examples/llms/chatCallback.ts](/examples/llms/chatCallback.ts)_

### Structured generation

<!-- embedme examples/llms/structured.ts -->

```ts
import "dotenv/config.js";
import { z } from "zod";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { OllamaChatLLM } from "bee-agent-framework/adapters/ollama/chat";
import { JsonDriver } from "bee-agent-framework/llms/drivers/json";

const llm = new OllamaChatLLM();
const driver = new JsonDriver(llm);
const response = await driver.generate(
  z.union([
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
  [
    BaseMessage.of({
      role: Role.USER,
      text: "Generate a profile of a citizen of Europe.",
    }),
  ],
);
console.info(response);
```

_Source: [examples/llms/structured.ts](/examples/llms/structured.ts)_

## Adding a new provider (adapter)

To use an inference provider that is not mentioned in our providers list feel free to [create a request](https://github.com/i-am-bee/bee-agent-framework/discussions).

If approved and you want to create it on your own, you must do the following things. Let's assume the name of your provider is `Custom.`

- Base location within the framework: `bee-agent-framework/adapters/custom`
  - Text LLM (filename): `llm.ts` ([example implementation](/examples/llms/providers/customProvider.ts))
  - Chat LLM (filename): `chat.ts` ([example implementation](/examples/llms/providers/customChatProvider.ts))

> [!IMPORTANT]
>
> If the target provider provides an SDK, use it.

> [!IMPORTANT]
>
> All provider-related dependencies (if any) must be included in `devDependencies` and `peerDependencies` in the [`package.json`](/package.json).

> [!TIP]
>
> To simplify work with the target RestAPI feel free to use the helper [`RestfulClient`](/src/internals/fetcher.ts) class.
> The client usage can be seen in the WatsonX LLM Adapter [here](/src/adapters/watsonx/llm.ts).

> [!TIP]
>
> Parsing environment variables should be done via helper functions (`parseEnv` / `hasEnv` / `getEnv`) that can be found [here](/src/internals/env.ts).
