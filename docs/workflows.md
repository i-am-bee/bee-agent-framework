# Workflows (experimental)

> [!TIP]
>
> Location within the framework `bee-agent-framework/experimental/workflows`.

Workflows provide a flexible and extensible component for managing and executing structured sequences of tasks.

- Dynamic Execution: Steps can direct the flow based on state or results.
- Validation: Define schemas for data consistency and type safety.
- Modularity: Steps can be standalone or invoke nested workflows.
- Observability: Emit events during execution to track progress or handle errors.

## Usage

#### Basic

<!-- embedme examples/workflows/simple.ts -->

```ts
import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import { z } from "zod";

const schema = z.object({
  hops: z.number().default(0),
});

const workflow = new Workflow({ schema })
  .addStep("a", async (state) => ({
    update: { hops: state.hops + 1 },
  }))
  .addStep("b", () => ({
    next: Math.random() > 0.5 ? Workflow.PREV : Workflow.END,
  }));

const response = await workflow.run({ hops: 0 }).observe((emitter) => {
  emitter.on("start", (data) => console.log(`-> start ${data.step}`));
  emitter.on("error", (data) => console.log(`-> error ${data.step}`));
  emitter.on("success", (data) => console.log(`-> finish ${data.step}`));
});

console.log(`Hops: ${response.result.hops}`);
console.log(`-> steps`, response.steps.map((step) => step.name).join(","));
```

_Source: [examples/workflows/simple.ts](/examples/workflows/simple.ts)_

#### Nesting

<!-- embedme examples/workflows/nesting.ts -->

```ts
import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import { z } from "zod";

const schema = z.object({
  threshold: z.number().min(0).max(1),
  counter: z.number().default(0),
});

const addFlow = new Workflow({ schema }).addStep("run", async (state) => ({
  next: Math.random() > 0.5 ? Workflow.SELF : Workflow.END,
  update: { counter: state.counter + 1 },
}));

const subtractFlow = new Workflow({
  schema,
}).addStep("run", async (state) => ({
  update: { counter: state.counter - 1 },
  next: Math.random() > 0.5 ? Workflow.SELF : Workflow.END,
}));

const workflow = new Workflow({
  schema,
})
  .addStep("start", (state) => ({
    next: Math.random() > state.threshold ? "delegateAdd" : "delegateSubtract",
  }))
  .addStep("delegateAdd", addFlow.asStep({ next: Workflow.END }))
  .addStep("delegateSubtract", subtractFlow.asStep({ next: Workflow.END }));

const response = await workflow.run({ threshold: 0.5 }).observe((emitter) => {
  emitter.on("start", (data, event) =>
    console.log(`-> step ${data.step}`, event.trace?.parentRunId ? "(nested flow)" : ""),
  );
});
console.info(`Counter:`, response.result);
```

_Source: [examples/workflows/nesting.ts](/examples/workflows/nesting.ts)_

### Content Creator Agent

<!-- embedme examples/workflows/agent.ts -->

```ts
import "dotenv/config";
import { BeeAgent } from "bee-agent-framework/agents/bee/agent";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { z } from "zod";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";
import { JsonDriver } from "bee-agent-framework/llms/drivers/json";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { ReadOnlyMemory } from "bee-agent-framework/memory/base";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { Workflow } from "bee-agent-framework/experimental/workflows/workflow";
import { createConsoleReader } from "examples/helpers/io.js";

const schema = z.object({
  answer: z.instanceof(BaseMessage).optional(),
  memory: z.instanceof(ReadOnlyMemory),
});

const workflow = new Workflow({ schema: schema })
  .addStep("simpleAgent", async (state) => {
    const simpleAgent = new BeeAgent({
      llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
      tools: [],
      memory: state.memory,
    });
    const answer = await simpleAgent.run({ prompt: null });
    reader.write("🤖 Simple Agent", answer.result.text);

    return {
      update: { answer: answer.result },
      next: "critique",
    };
  })
  .addStrictStep("critique", schema.required(), async (state) => {
    const llm = BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");
    const { parsed: critiqueResponse } = await new JsonDriver(llm).generate(
      z.object({ score: z.number().int().min(0).max(100) }),
      [
        BaseMessage.of({
          role: "system",
          text: `You are an evaluation assistant who scores the credibility of the last assistant's response. Chitchatting always has a score of 100. If the assistant was unable to answer the user's query, then the score will be 0.`,
        }),
        ...state.memory.messages,
        state.answer,
      ],
    );
    reader.write("🧠 Score", critiqueResponse.score.toString());

    return {
      next: critiqueResponse.score < 75 ? "complexAgent" : Workflow.END,
    };
  })
  .addStep("complexAgent", async (state) => {
    const complexAgent = new BeeAgent({
      llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
      tools: [new WikipediaTool(), new OpenMeteoTool()],
      memory: state.memory,
    });
    const { result } = await complexAgent.run({ prompt: null });
    reader.write("🤖 Complex Agent", result.text);
    return { update: { answer: result } };
  })
  .setStart("simpleAgent");

const reader = createConsoleReader();
const memory = new UnconstrainedMemory();

for await (const { prompt } of reader) {
  const userMessage = BaseMessage.of({
    role: Role.USER,
    text: prompt,
    meta: { createdAt: new Date() },
  });
  await memory.add(userMessage);

  const response = await workflow.run({
    memory: memory.asReadOnly(),
  });
  await memory.add(response.state.answer!);

  reader.write("🤖 Final Answer", response.state.answer!.text);
}
```

_Source: [examples/workflows/agent.ts](/examples/workflows/agent.ts)_

### Multi Agents

<!-- embedme examples/workflows/multiAgents.ts -->

```ts
import "dotenv/config";
import { BAMChatLLM } from "bee-agent-framework/adapters/bam/chat";
import { UnconstrainedMemory } from "bee-agent-framework/memory/unconstrainedMemory";
import { createConsoleReader } from "examples/helpers/io.js";
import { OpenMeteoTool } from "bee-agent-framework/tools/weather/openMeteo";
import { WikipediaTool } from "bee-agent-framework/tools/search/wikipedia";
import { AgentWorkflow } from "bee-agent-framework/experimental/workflows/agent";
import { BaseMessage, Role } from "bee-agent-framework/llms/primitives/message";

const workflow = new AgentWorkflow();
workflow.addAgent({
  name: "WeatherForecaster",
  instructions: "You are a weather assistant. Respond only if you can provide a useful answer.",
  tools: [new OpenMeteoTool()],
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
  execution: { maxIterations: 3 },
});
workflow.addAgent({
  name: "Researcher",
  instructions: "You are a researcher assistant. Respond only if you can provide a useful answer.",
  tools: [new WikipediaTool()],
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
});
workflow.addAgent({
  name: "Solver",
  instructions:
    "Your task is to provide the most useful final answer based on the assistants' responses which all are relevant. Ignore those where assistant do not know.",
  llm: BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct"),
});

const reader = createConsoleReader();
const memory = new UnconstrainedMemory();

for await (const { prompt } of reader) {
  await memory.add(
    BaseMessage.of({
      role: Role.USER,
      text: prompt,
      meta: { createdAt: new Date() },
    }),
  );

  const { result } = await workflow.run(memory.messages).observe((emitter) => {
    emitter.on("success", (data) => {
      reader.write(`-> ${data.step}`, data.response?.update?.finalAnswer ?? "-");
    });
  });
  await memory.addMany(result.newMessages);
  reader.write(`Agent 🤖`, result.finalAnswer);
}
```

_Source: [examples/workflows/multiAgents.ts](/examples/workflows/multiAgents.ts)_
