/**
 * Copyright 2025 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
