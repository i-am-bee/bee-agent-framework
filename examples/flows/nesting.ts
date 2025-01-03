import { Flow } from "bee-agent-framework/experimental/flows/flow";
import { z } from "zod";

const schema = z.object({
  threshold: z.number().min(0).max(1),
  counter: z.number().default(0),
});

const addFlow = new Flow({ schema }).addStep("run", async (state) => ({
  next: Math.random() > 0.5 ? Flow.SELF : Flow.END,
  update: { counter: state.counter + 1 },
}));

const subtractFlow = new Flow({
  schema,
}).addStep("run", async (state) => ({
  update: { counter: state.counter - 1 },
  next: Math.random() > 0.5 ? Flow.SELF : Flow.END,
}));

const flow = new Flow({
  schema,
})
  .addStep("start", (state) => ({
    next: Math.random() > state.threshold ? "delegateAdd" : "delegateSubtract",
  }))
  .addStep("delegateAdd", addFlow.asStep({ next: Flow.END }))
  .addStep("delegateSubtract", subtractFlow.asStep({ next: Flow.END }));

const response = await flow.run({ threshold: 0.5 }).observe((emitter) => {
  emitter.on("start", (data, event) =>
    console.log(`-> step ${data.step}`, event.trace?.parentRunId ? "(nested flow)" : ""),
  );
});
console.info(`Counter:`, response.result);
