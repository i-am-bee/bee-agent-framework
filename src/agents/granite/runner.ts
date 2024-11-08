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
import { z } from "zod";
import * as R from "remeda";
import { BeeAgentRunner } from "@/agents/bee/runner.js";
import { PromptTemplate } from "@/template.js";
import { BeeParserInput } from "@/agents/bee/parser.js";
import { isEmpty } from "remeda";

const graniteBeeSystemPrompt = new PromptTemplate({
  schema: z.object({
    instructions: z.string().default("You are a helpful assistant."),
    tools: z.array(
      z
        .object({
          name: z.string().min(1),
          description: z.string().min(1),
          schema: z.string().min(1),
        })
        .passthrough(),
    ),
  }),
  template: `# Setting
You are an AI assistant.
When the user sends a message figure out a solution and provide a final answer.
{{#tools.length}}
You have access to a set of available_tools that can be used to retrieve information and perform actions.
Pay close attention to the tool description to determine if a tool is useful in a partcular context.
{{/tools.length}}
{{#datetime}}
The current date is {{datetime}}.
{{/datetime}}

# Communication structure: 
- Line starting 'Message: ' The user's question or instruction. This is provided by the user, the assistant does not produce this.
- Line starting 'Thought: ' The assistant's response always starts with a thought, this is free text where the assistant thinks about the user's message and describes in detail what it should do next. 
{{#tools.length}}
- In a 'Thought', the assistant should determine if a Tool Call is necessary to get more information or perform an action, or if the available information is sufficient to provide the Final Answer.
- If a tool needs to be called and is available, the assistant will produce a tool call:
- Line starting 'Tool Name: ' name of the tool that you want to use.
- Line starting 'Tool Input: ' JSON formatted tool arguments adhering to the selected tool parameters schema i.e. {"arg1":"value1", "arg2":"value2"}. 
- Line starting 'Thought: ', followed by free text where the assistant thinks about the all the information it has available, and what it should do next (e.g. try the same tool with a different input, try a different tool, or proceed with answering the original user question).
{{/tools.length}}
- Once enough information is available to provide the Final Answer, the last line in the message needs to be: 
- Line starting 'Final Answer: ' followed by a answer to the original message.

# Best practices
- Use markdown syntax for formatting code snippets, links, JSON, tables, images, files.
{{#tools.length}}
- Do not attempt to use a tool that is not listed in available tools. This will cause an error.
- Make sure that tool input is in the correct format and contains the correct arguments.
{{/tools.length}}
- When the message is unclear, respond with a line starting with 'Final Answer:' followed by a request for additional information needed to solve the problem.
- When the user wants to chitchat instead, always respond politely.

{{#tools.length}}
# File Handling
If a file is provided by the user, make sure you always use the FileRead tool immediately to read the contents of the file.
{{/tools.length}}

# Date and Time
The current date and time is contained in the most recent user message.

# Persona
{{instructions}}
`,
});

const AVAILABLE_TOOLS_ROLE = "available_tools";

export class GraniteAgentRunner extends BeeAgentRunner {
  static async create(input: BeeInput, options: BeeRunOptions, prompt: string | null) {
    const instance = await super.create(
      {
        ...input,
        templates: {
          ...input.templates,
          system: graniteBeeSystemPrompt,
        },
      },
      options,
      prompt,
    );

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
