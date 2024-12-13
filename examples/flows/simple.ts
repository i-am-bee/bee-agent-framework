import { Flow } from "bee-agent-framework/flows";
import { z } from "zod";

const schema = z.object({
  hops: z.number().default(0),
});

const flow = new Flow({ schema })
  .addStep("a", async (state) => ({})) // does nothing
  .addStep("b", async (state) => ({
    // adds one and moves to b
    update: { hops: state.hops + 1 },
  }))
  .addStep("c", async (state) => ({
    update: { hops: state.hops + 1 },
    next: Math.random() > 0.5 ? "b" : Flow.END,
  }));

const response = await flow.run({ hops: 0 }).observe((emitter) => {
  emitter.on("start", (data) => console.log(`-> start ${data.step}`));
  emitter.on("error", (data) => console.log(`-> error ${data.step}`));
  emitter.on("success", (data) => console.log(`-> finish ${data.step}`));
});

console.log(`Hops: ${response.result.hops}`);
console.log(`-> steps`, response.steps.map((step) => step.name).join(","));
