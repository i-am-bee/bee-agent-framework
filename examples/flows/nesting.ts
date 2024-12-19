import { Flow } from "bee-agent-framework/experimental/flows";
import { z } from "zod";

const schema = z.object({
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
  schema: z.object({
    threshold: z.number().min(0).max(1),
    counter: z.number().default(0),
  }),
})
  .addStep("start", (state) => ({
    next: Math.random() > state.threshold ? "addFlow" : "subtractFlow",
  }))
  .addStep("addFlow", addFlow.asStep({ next: Flow.END }))
  .addStep("subtractFlow", subtractFlow);

const response = await flow.run({ threshold: 0.5 }).observe((emitter) => {
  emitter.on("start", (data, event) =>
    console.log(`-> step ${data.step}`, event.trace?.parentRunId ? "(nested flow)" : ""),
  );
});
console.info(`Counter:`, response.result);
