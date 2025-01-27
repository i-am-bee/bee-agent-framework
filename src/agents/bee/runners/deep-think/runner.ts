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
import { LinePrefixParser } from "@/agents/parsers/linePrefix.js";
import { JSONParserField, ZodParserField } from "@/agents/parsers/field.js";
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
    const parserRegex = isEmpty(tools)
      ? new RegExp(`<think>.+?</think>\\n\\nFinal Answer: [\\s\\S]+`)
      : new RegExp(
          `<think>.+?</think>\\n\\n(?:Final Answer: [\\s\\S]+|Tool Name: (${tools.map((tool) => tool.name).join("|")})\\nTool Input: \\{.*\\})`,
        )

    const parser = new LinePrefixParser<any>(
      {
        thought: {
          prefix: "<think>",
          next: ["dummy_thought_end"],
          isStart: true,
          field: new ZodParserField(z.string().min(1).transform(s => s.trim())),
        },
        dummy_thought_end: {
          prefix: "</think>",
          next: ["tool_name", "final_answer"],
          field: new ZodParserField(z.string().transform(_ => "")),
        },
        tool_name: {
          prefix: "Tool Name:",
          next: ["tool_input"],
          field: new ZodParserField(
            z.pipeline(
              z.string().trim(),
              z.enum(tools.map((tool) => tool.name) as [string, ...string[]]),
            ),
          ),
        },
        tool_input: {
          prefix: "Tool Input:",
          next: ["tool_output"],
          isEnd: true,
          field: new JSONParserField({
            schema: z.object({}).passthrough(),
            base: {},
            matchPair: ["{", "}"],
          }),
        },
        tool_output: {
          prefix: "Tool Output:",
          next: ["final_answer"],
          isEnd: true,
          field: new ZodParserField(z.string()),
        },
        final_answer: {
          prefix: "Final Answer:",
          next: [],
          isStart: true,
          isEnd: true,
          field: new ZodParserField(z.string().min(1)),
        },
      },
      {
        waitForStartNode: true,
        endOnRepeat: true,
        lazyTransition: true,
        fallback: (stash) =>
          stash
            ? [
                { key: "thought", value: "I now know the final answer." },
                { key: "final_answer", value: stash },
              ]
            : [],
      },
    );

    return {
      parser,
      parserRegex,
    } as const;
  }
}
