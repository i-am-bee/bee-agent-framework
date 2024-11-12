/**
 * Copyright 2024 IBM Corp.
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

import { BeeRunInput, BeeRunOptions, BeeRunOutput } from "@/agents/bee/types.js";
import { GetRunContext } from "@/context.js";
import { BeeAgent, BeeInput } from "@/agents/bee/agent.js";
import { GraniteAgentRunner } from "./runner.js";
import { GraniteBeeAssistantPrompt, GraniteBeeSystemPrompt } from "@/agents/granite/prompts.js";
import { BaseMessage } from "@/llms/primitives/message.js";

export class GraniteBeeAgent extends BeeAgent {
  protected runner: typeof GraniteAgentRunner = GraniteAgentRunner;

  constructor(input: BeeInput) {
    super({
      ...input,
      templates: {
        ...input.templates,
        system: GraniteBeeSystemPrompt,
        assistant: GraniteBeeAssistantPrompt,
      },
    });
  }

  protected async _run(
    input: BeeRunInput,
    options: BeeRunOptions = {},
    run: GetRunContext<typeof this>,
  ): Promise<BeeRunOutput> {
    const cleanup = run.emitter.on(
      "update",
      async ({ update, meta, memory }) => {
        if (update.key === "tool_output") {
          await memory.add(
            BaseMessage.of({
              role: "tool_response",
              text: update.value,
              meta: { success: meta.success },
            }),
          );
        }
      },
      {
        isBlocking: true,
      },
    );
    return super._run(input, options, run).finally(cleanup);
  }
}
