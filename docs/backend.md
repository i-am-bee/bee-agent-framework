# Backend

> [!TIP]
>
> Location for concrete implementations within the framework `bee-agent-framework/adapters/provider/backend`.
>
> Location for base abstraction within the framework `bee-agent-framework/backend`.

The backend module is an umbrella module that encapsulates unified way to work with the following functionalities:

- Chat Models via (`ChatModel` class)
- Embedding Models via (`EmbeddingModel` class)
- Audio Models (coming soon)
- Image Models (coming soon)

## Providers (implementations)

The following table depicts supported providers.

| Name             | Chat | Embedding | Environment Variables                                                                                                                                                 |
| ---------------- | :--: | :-------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Ollama`         |  ✅  |    ✅     | OLLAMA_CHAT_MODEL<br>OLLAMA_EMBEDDING_MODEL<br/>OLLAMA_BASE_URL                                                                                                       |
| `OpenAI`         |  ✅  |    ✅     | OPENAI_CHAT_MODEL<br>OPENAI_EMBEDDING_MODEL<br>OPENAI_API_ENDPOINT<br>OPENAI_API_KEY<br>OPENAI_API_HEADERS                                                            |
| `Groq`           |  ✅  |    ✅     | GROQ_CHAT_MODEL<br>GROQ_EMBEDDING_MODEL<br>GROQ_API_BASE_URL<br>GROQ_API_KEY                                                                                          |
| `Amazon Bedrock` |  ✅  |    ✅     | AWS_CHAT_MODEL<br>AWS_EMBEDDING_MODEL<br>AWS_ACCESS_KEY_ID<br>AWS_SECRET_ACCESS_KEY<br>AWS_REGION<br>AWS_SESSION_TOKEN                                                |
| `Google Vertex`  |  ✅  |    ✅     | GOOGLE_VERTEX_CHAT_MODEL<br>GOOGLE_VERTEX_EMBEDDING_MODEL<br>GOOGLE_VERTEX_PROJECT<br>GOOGLE_VERTEX_ENDPOINT<br>GOOGLE_VERTEX_LOCATION                                |
| `WatsonX`        |  ✅  |    ✅     | WATSONX_CHAT_MODEL<br/>WATSONX_EMBEDDING_MODEL<br>WATSONX_API_KEY<br/>WATSONX_PROJECT_ID<br/>WATSONX_SPACE_ID<br>WATSONX_VERSION<br>WATSONX_REGION                    |
| `Azure OpenAI`   |  ✅  |    ✅     | AZURE_OPENAI_CHAT_MODEL<br>AZURE_OPENAI_EMBEDDING_MODEL<br>AZURE_OPENAI_API_KEY<br>AZURE_OPENAI_API_ENDPOINT<br>AZURE_OPENAI_API_RESOURCE<br>AZURE_OPENAI_API_VERSION |

> [!TIP]
>
> If you don't see your provider raise an issue [here](https://github.com/i-am-bee/bee-agent-framework/discussions). In meanwhile, you can use [LangChain adapter](/examples/backend/providers/langchain.ts).

### Initialization

```ts
import { Backend } from "bee-agent-framework/backend/core";

const backend = await Backend.fromProvider("watsonx"); // use provider's name from the list below
console.log(backend.chat.modelId); // uses provider's default model or the one specified via env
console.log(backend.embedding.modelId); // uses provider's default model or the one specified via env
```

All providers' examples can be found in [examples/backend/providers](/examples/backend/providers).

## Chat Model

The `ChatModel` class represents a Chat Large Language Model and can be initiated in one of the following ways.

```ts
import { ChatModel } from "bee-agent-framework/backend/core";

const model = await ChatModel.fromName("ollama:llama3.1");
console.info(model.providerId); // ollama
console.info(model.modelId); // llama3.1
```

or you can always create the concrete provider's chat model directly

```ts
import { OpenAIChatModel } from "bee-agent-framework/adapters/openai/chat";

const model = new OpenAIChatModel(
  "gpt-4o",
  {
    // optional provider settings
    reasoningEffort: "low",
    parallelToolCalls: false,
  },
  {
    // optional provider client settings
    baseURL: "your_custom_endpoint",
    apiKey: "your_api_key",
    compatibility: "compatible",
    headers: {
      CUSTOM_HEADER: "...",
    },
  },
);
```

### Configuration

```ts
import { ChatModel, UserMessage } from "bee-agent-framework/backend/core";
import { SlidingCache } from "bee-agent-framework/cache/slidingCache";

const model = await ChatModel.fromName("watsonx:ibm/granite-3-8b-instruct");
model.config({
  parameters: {
    maxTokens: 300,
    temperature: 0.15,
    topP: 1,
    frequencyPenalty: 1.1,
    topK: 1,
    n: 1,
    presencePenalty: 1,
    seed: 7777,
    stopSequences: ["\n\n"],
  },
  cache: new SlidingCache({
    size: 25,
  }),
});
```

### Generation

```ts
import { ChatModel, UserMessage } from "bee-agent-framework/backend/core";

const model = await ChatModel.fromName("ollama:llama3.1");
const response = await model.create({
  messages: [new UserMessage("Hello world!")],
});
console.log(response.getTextContent());
```

> [!NOTE]
>
> Execution parameters (those passed to `model.create({...})`) are superior to ones defined via `config`.

### Stream

```ts
import { ChatModel, UserMessage } from "bee-agent-framework/backend/core";

const model = await ChatModel.fromName("ollama:llama3.1");
const response = await model
  .create({
    messages: [new UserMessage("Hello world!")],
    stream: true,
  })
  .observe((emitter) => {
    emitter.on("update", ({ value }) => {
      console.log("token", value.getTextContent());
    });
  });

console.log("Finish Reason:", response.finishReason);
console.log("Token Usage:", response.usage);
```

### Structured Generation

<!-- embedme examples/backend/structured.ts -->

```ts
import { ChatModel, Message, Role } from "bee-agent-framework/backend/core";
import { z } from "zod";

const model = await ChatModel.fromName("ollama:llama3.1");
const response = await model.createStructure({
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
console.log(response.object);
```

_Source: [examples/backend/structured.ts](/examples/backend/structured.ts)_

## Embedding Model

The `EmbedingModel` class represents a Embedding Model and can be initiated in one of the following ways.

```ts
import { EmbedingModel } from "bee-agent-framework/backend/core";

const model = await EmbedingModel.fromName("ibm/granite-embedding-107m-multilingual");
console.info(model.providerId); // watsonx
console.info(model.modelId); // ibm/granite-embedding-107m-multilingual
```

or you can always create the concrete provider's embedding model directly

```ts
import { OpenAIEmbeddingModel } from "bee-agent-framework/adapters/openai/embedding";

const model = new OpenAIEmbeddingModel(
  "text-embedding-3-large",
  {
    dimensions: 512,
    maxEmbeddingsPerCall: 5,
  },
  {
    baseURL: "your_custom_endpoint",
    compatibility: "compatible",
    headers: {
      CUSTOM_HEADER: "...",
    },
  },
);
```

### Usage

```ts
import { EmbeddingModel } from "bee-agent-framework/backend/core";

const model = await EmbeddingModel.fromName("ollama:nomic-embed-text");
const response = await model.create({
  values: ["Hello world!", "Hello Bee!"],
});
console.log(response.values);
console.log(response.embeddings);
```
