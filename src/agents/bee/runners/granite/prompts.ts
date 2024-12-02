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

import { PromptTemplate } from "@/template.js";
import { z } from "zod";
import { BeeAssistantPrompt, BeeSchemaErrorPrompt } from "@/agents/bee/prompts.js";

export const GraniteBeeAssistantPrompt = BeeAssistantPrompt.fork((config) => ({
  ...config,
  template: `{{#thought}}Thought: {{.}}\n{{/thought}}{{#toolName}}Tool Name: {{.}}\n{{/toolName}}{{#toolInput}}Tool Input: {{.}}\n{{/toolInput}}{{#finalAnswer}}Final Answer: {{.}}{{/finalAnswer}}`,
}));

export const GraniteBeeSystemPrompt = new PromptTemplate({
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

export const GraniteBeeSchemaErrorPrompt = BeeSchemaErrorPrompt.fork((config) => ({
  ...config,
  template: `Error: The generated response does not adhere to the communication structure mentioned in the system prompt.
You communicate only in instruction lines. Valid instruction lines are 'Thought' followed by either 'Tool Name' + 'Tool Input' or 'Final Answer'.`,
}));
