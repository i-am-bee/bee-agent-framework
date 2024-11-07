import { BaseMessage, Role } from "@/llms/primitives/message.js";
import {
  BeeAgentRunIteration,
  BeeMeta,
  BeeRunInput,
  BeeRunOptions,
  BeeRunOutput,
} from "@/agents/bee/types.js";
import { GetRunContext } from "@/context.js";
import { BeeAgentError } from "@/agents/bee/errors.js";
import { BeeIterationToolResult } from "@/agents/bee/parser.js";
import { BeeAgent } from "@/agents/bee/agent.js";
import * as R from "remeda";
import { GraniteAgentRunner } from "./runner.js";
import { z } from "zod";
import { PromptTemplate } from "@/template.js";

const GraniteBeeAssistantPrompt = new PromptTemplate({
  schema: z
    .object({
      thought: z.array(z.string()),
      toolName: z.array(z.string()),
      toolInput: z.array(z.string()),
      finalAnswer: z.array(z.string()),
    })
    .partial(),
  template: `{{#thought}}Thought: {{.}}\n{{/thought}}{{#toolName}}Tool Name: {{.}}\n{{/toolName}}{{#toolInput}}Tool Input: {{.}}\n{{/toolInput}}{{#finalAnswer}}Final Answer: {{.}}{{/finalAnswer}}`,
});

const TOOL_RESPONSE_ROLE = "tool_response";

export class GraniteBeeAgent extends BeeAgent {
  protected runner: typeof GraniteAgentRunner = GraniteAgentRunner;

  protected async _run(
    input: BeeRunInput,
    options: BeeRunOptions = {},
    run: GetRunContext<typeof this>,
  ): Promise<BeeRunOutput> {
    const iterations: BeeAgentRunIteration[] = [];
    const maxIterations = options?.execution?.maxIterations ?? Infinity;
    const runner = await this.runner.create(this.input, options, input.prompt);

    let finalMessage: BaseMessage | undefined;
    while (!finalMessage) {
      const meta: BeeMeta = { iteration: iterations.length + 1 };
      if (meta.iteration > maxIterations) {
        throw new BeeAgentError(
          `Agent was not able to resolve the task in ${maxIterations} iterations.`,
          [],
          { isFatal: true },
        );
      }

      const emitter = run.emitter.child({ groupId: `iteration-${meta.iteration}` });
      const iteration = await runner.llm({ emitter, signal: run.signal, meta });

      if (iteration.state.tool_name || iteration.state.tool_input) {
        const { output, success } = await runner.tool({
          iteration: iteration.state as BeeIterationToolResult,
          signal: run.signal,
          emitter,
          meta,
        });

        for (const key of ["partialUpdate", "update"] as const) {
          await emitter.emit(key, {
            data: {
              ...iteration.state,
              tool_output: output,
            },
            update: { key: "tool_output", value: output, parsedValue: output },
            meta: { success, ...meta },
          });
        }

        await runner.memory.addMany([
          BaseMessage.of({
            role: Role.ASSISTANT,
            text: GraniteBeeAssistantPrompt.clone().render({
              toolName: [iteration.state.tool_name].filter(R.isTruthy),
              toolInput: [iteration.state.tool_input]
                .filter(R.isTruthy)
                .map((call) => JSON.stringify(call)),
              thought: [iteration.state.thought].filter(R.isTruthy),
              finalAnswer: [iteration.state.final_answer].filter(R.isTruthy),
            }),
            meta: { success },
          }),
          BaseMessage.of({
            role: TOOL_RESPONSE_ROLE,
            text: output,
            meta: { success },
          }),
        ]);
      }
      if (iteration.state.final_answer) {
        finalMessage = BaseMessage.of({
          role: Role.ASSISTANT,
          text: iteration.state.final_answer,
          meta: {
            createdAt: new Date(),
          },
        });
        await run.emitter.emit("success", {
          data: finalMessage,
          iterations,
          memory: runner.memory,
          meta,
        });
        await runner.memory.add(finalMessage);
      }
      iterations.push(iteration);
    }

    if (input.prompt !== null) {
      await this.input.memory.add(
        BaseMessage.of({
          role: Role.USER,
          text: input.prompt,
          meta: {
            createdAt: run.createdAt,
          },
        }),
      );
    }
    await this.input.memory.add(finalMessage);

    return { result: finalMessage, iterations, memory: runner.memory };
  }
}
