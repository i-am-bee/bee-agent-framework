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

import { isEmpty } from "remeda";
import type { AnyTool } from "@/tools/base.js";
import { DefaultRunner } from "@/agents/bee/runners/default/runner.js";
import {
  DeepThinkBeeAssistantPrompt,
  DeepThinkBeeSchemaErrorPrompt,
  DeepThinkBeeSystemPrompt,
  DeepThinkBeeToolErrorPrompt,
  DeepThinkBeeToolInputErrorPrompt,
  DeepThinkBeeToolNotFoundPrompt,
  DeepThinkBeeUserPrompt,
} from "@/agents/bee/runners/deep-think/prompts.js";
import { BeeToolNoResultsPrompt, BeeUserEmptyPrompt } from "@/agents/bee/prompts.js";
import { Cache } from "@/cache/decoratorCache.js";
import { ZodParserField } from "@/agents/parsers/field.js";
import { z } from "zod";

export class DeepThinkRunner extends DefaultRunner {
  @Cache({ enumerable: false })
  public get defaultTemplates() {
    return {
      system: DeepThinkBeeSystemPrompt,
      assistant: DeepThinkBeeAssistantPrompt,
      user: DeepThinkBeeUserPrompt,
      schemaError: DeepThinkBeeSchemaErrorPrompt,
      toolNotFoundError: DeepThinkBeeToolNotFoundPrompt,
      toolError: DeepThinkBeeToolErrorPrompt,
      toolInputError: DeepThinkBeeToolInputErrorPrompt,
      // Note: These are from bee
      userEmpty: BeeUserEmptyPrompt,
      toolNoResultError: BeeToolNoResultsPrompt,
    };
  }

  static {
    this.register();
  }

  protected createParser(tools: AnyTool[]) {
    const { parser } = super.createParser(tools);

    const parserRegex = isEmpty(tools)
      ? new RegExp(`<think>.+?</think>\\n\\nFinal Answer: [\\s\\S]+`)
      : new RegExp(
          `<think>.+?</think>\\n\\n(?:Final Answer: [\\s\\S]+|Tool Name: (${tools.map((tool) => tool.name).join("|")})\\nTool Input: \\{.*\\})`,
        );

    return {
      parserRegex,
      parser: parser.fork((nodes, options) => ({
        options: {
          ...options,
          // @ts-expect-error
          silentNodes: [...(options?.silentNodes ?? []), "dummy_thought_end"],
        },
        nodes: {
          ...nodes,
          thought: {
            ...nodes.thought,
            prefix: "<think>",
            // @ts-expect-error
            next: ["dummy_thought_end"] as const,
            isStart: true,
            field: new ZodParserField(z.string().min(1)),
          },
          dummy_thought_end: {
            prefix: "</think>",
            isDummy: true,
            next: ["tool_name", "final_answer"],
            field: new ZodParserField(z.string().transform((_) => "")),
          },
          tool_name: { ...nodes.tool_name, prefix: "Tool Name:" },
          tool_input: {
            ...nodes.tool_input,
            prefix: "Tool Input:",
            isEnd: true,
            next: [],
          },
          tool_output: { ...nodes.tool_name, prefix: "Tool Output:" },
        },
      })),
    } as const;
  }
}
