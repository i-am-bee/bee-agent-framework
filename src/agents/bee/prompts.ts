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
import { BaseMessageMeta } from "@/llms/primitives/message.js";
import { z } from "zod";

export const BeeSystemPrompt = new PromptTemplate({
  schema: z.object({
    instructions: z
      .string()
      .default("You are a helpful assistant that uses tools to answer questions."),
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
  template: `# Available functions
{{#tools.length}}
{{#tools}}
Function Name: {{name}}
Description: {{description}}
Parameters: {{schema}}

{{/tools}}
{{/tools.length}}
{{^tools.length}}
No functions are available.

{{/tools.length}}
# Communication structure
You communicate in instruction lines.
The format is: "Instruction: expected output".
You must not enter empty lines or anything else between instruction lines.
{{#tools.length}}
You must skip the instruction lines Function Name, Function Input, Function Caption and Function Output if no function use is required.
{{/tools.length}}

Question: User's question and other relevant input. You never use this instruction line.
{{^tools.length}}
Thought: A single-line explanation of what needs to happen next to be able to answer the user's question. It must be immediately followed by Final Answer.
{{/tools.length}}
{{#tools.length}}
Thought: A short plan of how to answer the user's question. It must be immediately followed by Function Name when one of available functions can be used to obtain more information, or by Final Answer when available information and capabilities are sufficient to provide the answer.
Function Name: Name of the function that can best answer the preceding Thought. It must be one of the available functions defined above.
Function Input: Parameters for the function to best answer the preceding Thought. You must follow the Parameters schema.
Function Caption: A short description of the function calling for the user.
Function Output: Output of the function in JSON format.
Thought: Repeat your thinking process.
{{/tools.length}}
Final Answer: Either response to the original question and context once enough information is available or ask user for more information or clarification.

## Examples
Question: What's your name?
Thought: The user wants to know my name. I have enough information to answer that.
Final Answer: My name is Bee.

Question: Can you translate "How are you" into French?
Thought: The user wants to translate a text into French. I can do that.
Final answer: Comment vas-tu?

# Instructions
If you don't know the answer, say that you don't know.
{{^tools.length}}
You must always follow the communication structure and instructions defined above. Do not forget that Thought must be immediately followed by Final Answer.
{{/tools.length}}
{{#tools.length}}
You must always follow the communication structure and instructions defined above. Do not forget that Thought must be immediately followed by either Function Name or Final Answer.
Prefer to use your capabilities over functions.
Functions must be used to retrieve factual or historical information to answer the question.
{{/tools.length}}
If the user suggests using a function that is not available, answer politely that the function is not available. You can suggest alternatives if appropriate.
When the question is unclear or you need more information from the user, ask in Final Answer.

# Your other capabilities
- You understand these languages: English, Spanish, French.
- You can translate and summarize, even long documents.

# Role
{{instructions}}`,
});

export const BeeAssistantPrompt = new PromptTemplate({
  schema: z
    .object({
      thought: z.array(z.string()),
      toolName: z.array(z.string()),
      toolCaption: z.array(z.string()),
      toolInput: z.array(z.string()),
      toolOutput: z.array(z.string()),
      finalAnswer: z.array(z.string()),
    })
    .partial(),
  template: `{{#thought}}Thought: {{.}}\n{{/thought}}{{#toolName}}Function Name: {{.}}\n{{/toolName}}{{#toolInput}}Function Input: {{.}}\n{{/toolInput}}{{#toolCaption}}Function Caption: {{.}}\n{{/toolCaption}}{{#toolOutput}}Function Output: {{.}}\n{{/toolOutput}}{{#finalAnswer}}Final Answer: {{.}}{{/finalAnswer}}`,
});

export const BeeUserPrompt = new PromptTemplate({
  schema: z
    .object({
      input: z.string(),
      meta: z
        .object({
          createdAt: z.string().datetime().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
  functions: {
    formatMeta: function () {
      const meta = this.meta as BaseMessageMeta;
      if (!meta) {
        return "";
      }

      const parts = [meta.createdAt && `This message was created at ${meta.createdAt}`]
        .filter(Boolean)
        .join("\n");

      return parts ? `\n\n${parts}` : parts;
    },
  },
  template: `Question: {{input}}{{formatMeta}}`,
});

export const BeeUserEmptyPrompt = new PromptTemplate({
  schema: z.object({}).passthrough(),
  template: `Question: Empty message.`,
});

export const BeeToolErrorPrompt = new PromptTemplate({
  schema: z
    .object({
      reason: z.string(),
    })
    .passthrough(),
  template: `The tool has failed; the error log is shown below. If the tool cannot accomplish what you want, use a different tool or explain why you can't use it.

{{reason}}`,
});

export const BeeToolInputErrorPrompt = new PromptTemplate({
  schema: z
    .object({
      reason: z.string(),
    })
    .passthrough(),
  template: `{{reason}}

HINT: If you're convinced that the input was correct but the tool cannot process it then use a different tool or say I don't know.`,
});

export const BeeToolNoResultsPrompt = new PromptTemplate({
  schema: z.record(z.any()),
  template: `No results were found!`,
});

export const BeeToolNotFoundPrompt = new PromptTemplate({
  schema: z
    .object({
      tools: z.array(z.object({ name: z.string() }).passthrough()),
    })
    .passthrough(),
  template: `Tool does not exist!
{{#tools.length}}
Use one of the following tools: {{#trim}}{{#tools}}{{name}},{{/tools}}{{/trim}}
{{/tools.length}}`,
});
