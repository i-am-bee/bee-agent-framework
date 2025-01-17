# Integrations

Bee Agent Framework is open-source framework for building, deploying, and serving powerful multi-agent workflows at scale which includes integrating with other agent frameworks.

## LangGraph

<!-- embedme examples/integrations/langgraph.ts -->

```ts
import "dotenv/config";
import { DuckDuckGoSearch as LangChainDDG } from "@langchain/community/tools/duckduckgo_search";
import { createReactAgent as createLangGraphReactAgent } from "@langchain/langgraph/prebuilt";
import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import { z } from "zod";
import { createConsoleReader } from "examples/helpers/io.js";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { DuckDuckGoSearchTool } from "bee-agent-framework/tools/search/duckDuckGoSearch";
import { OllamaChatLLM as BeeOllamaChat } from "bee-agent-framework/adapters/ollama/chat";
import { ChatOllama as LangChainOllamaChat } from "@langchain/ollama";
import { ReadOnlyMemory } from "bee-agent-framework/memory/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { BaseMessage } from "bee-agent-framework/llms/primitives/message";
import { ChatMessage as LangChainMessage } from "@langchain/core/messages";

const workflow = new Workflow({
  schema: z.object({ memory: z.instanceof(ReadOnlyMemory), answer: z.string().default("") }),
})
  .addStep("router", () => ({
    next: Math.random() >= 0.5 ? "bee" : "langgraph",
  }))
  .addStep("bee", async (state, ctx) => {
    const beeAgent = new BeeAgent({
      llm: new BeeOllamaChat({ modelId: "llama3.1" }),
      tools: [new DuckDuckGoSearchTool()],
      memory: state.memory,
    });
    const response = await beeAgent.run(
      { prompt: null },
      { signal: ctx.signal, execution: { maxIterations: 5 } },
    );
    const answer = response.result.text;
    return { next: Workflow.END, update: { answer } };
  })
  .addStep("langgraph", async (state, ctx) => {
    const langGraphAgent = createLangGraphReactAgent({
      llm: new LangChainOllamaChat({ model: "llama3.1" }),
      tools: [new LangChainDDG()],
    });
    const response = await langGraphAgent.invoke(
      {
        messages: state.memory.messages.map(
          (msg) => new LangChainMessage({ role: msg.role, content: msg.text }),
        ),
      },
      { signal: ctx.signal, recursionLimit: 5 },
    );
    const answer = response.messages.at(-1).content;
    return { next: Workflow.END, update: { answer } };
  });

const memory = new UnconstrainedMemory();
const reader = createConsoleReader();

for await (const { prompt } of reader) {
  await memory.add(BaseMessage.of({ role: "user", text: prompt }));
  const { result, steps } = await workflow.run({ memory: memory.asReadOnly() });
  reader.write(`LLM 🤖 : `, result.answer);
  reader.write(`-> solved by `, steps.at(-1)!.name);
  await memory.add(BaseMessage.of({ role: "assistant", text: result.answer }));
}
```

_Source: [examples/integrations/langgraph.ts](/examples/integrations/langgraph.ts)_
