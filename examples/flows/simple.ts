import { Flow } from "bee-agent-framework/flows";
import { z } from "zod";

const schema = z.object({
  hops: z.number().default(0),
});

const sumFlow = new Flow({ schema })
  .addStep("a", async (state) => ({})) // does nothing
  .addStep("b", async (state) => ({
    // adds one and moves to b
    update: { hops: state.hops + 1 },
  }))
  .addStep("c", async () => ({
    next: Math.random() > 0.5 ? "b" : Flow.END,
  }));

const multipleFlow = new Flow({
  schema: schema.extend({ multiplier: z.number().int().min(1) }),
})
  .addStep("a", async (state) => ({
    // adds one and moves to b
    update: { hops: state.hops * state.multiplier },
  }))
  .addStep("b", async () => ({
    next: Math.random() > 0.5 ? "a" : Flow.END,
  }));

const flow = new Flow({ schema })
  .addStep("start", () => ({
    next: Math.random() > 0.5 ? "sum" : "multiple",
  }))
  .addStep(
    "multiple",
    multipleFlow.asStep({ next: Flow.END, input: ({ hops }) => ({ hops, multiplier: 2 }) }),
  )
  .addStep("sum", sumFlow);

const response = await flow.run({ hops: 0 }).observe((emitter) => {
  emitter.on("start", (data, event) =>
    console.log(`-> step ${data.step}`, event.path, event.trace),
  );
  //emitter.on("error", (data) => console.log(`-> error ${data.step}`));
  //emitter.on("success", (data) => console.log(`-> finish ${data.step}`));
});

console.log(`Hops: ${response.result.hops}`);
console.log(`-> steps`, response.steps.map((step) => step.name).join(","));
