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
import { BaseMessage, Role } from "@/llms/primitives/message.js";
import { BeeRunOptions } from "@/agents/bee/types.js";
import { AnyTool } from "@/tools/base.js";
import { BeeInput } from "@/agents/bee/agent.js";
import * as R from "remeda";
import { BeeAgentRunner } from "@/agents/bee/runner.js";
import { BeeParserInput } from "@/agents/bee/parser.js";
import { isEmpty } from "remeda";

const AVAILABLE_TOOLS_ROLE = "available_tools";

export class GraniteAgentRunner extends BeeAgentRunner {
  static async create(input: BeeInput, options: BeeRunOptions, prompt: string | null) {
    const instance = await super.create(input, options, prompt);

    if (!isEmpty(input.tools)) {
      const index = instance.memory.messages.findIndex((msg) => msg.role === Role.SYSTEM) + 1;
      await instance.memory.add(
        BaseMessage.of({
          role: AVAILABLE_TOOLS_ROLE,
          text: JSON.stringify(
            await Promise.all(
              input.tools.map(async (tool) => ({
                name: tool.name,
                description: tool.description.replaceAll("\n", ".").replace(/\.$/, "").concat("."),
                parameters: R.omit(await tool.getInputJsonSchema(), [
                  "minLength",
                  "maxLength",
                  "$schema",
                ]),
              })),
            ),
            null,
            4,
          ),
        }),
        index,
      );
    }

    return instance;
  }

  protected createParser(tools: AnyTool[]) {
    const { parser } = super.createParser(tools);

    return {
      parserRegex: /Thought:.+\n(?:Final Answer:[\S\s]+|Tool Name:.+\nTool Input:\{.*\})?/,
      parser: parser.fork<BeeParserInput>((nodes, options) => ({
        options,
        nodes: {
          ...nodes,
          tool_name: { ...nodes.tool_name, prefix: "Tool Name:" },
          tool_input: { ...nodes.tool_input, prefix: "Tool Input:", isEnd: true, next: [] },
        },
      })),
    };
  }
}
