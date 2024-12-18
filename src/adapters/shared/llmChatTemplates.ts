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
import { BaseMessage } from "@/llms/primitives/message.js";
import { ValueError } from "@/errors.js";
import { isDefined, mapToObj, pickBy } from "remeda";
import { z } from "zod";
import { toBoundedFunction } from "@/serializer/utils.js";

export type LLMChatPromptTemplate = PromptTemplate.infer<{ messages: Record<string, string[]>[] }>;

export interface LLMChatTemplate {
  template: LLMChatPromptTemplate;
  messagesToPrompt: (template: LLMChatPromptTemplate) => (messages: BaseMessage[]) => string;
  parameters: {
    stop_sequence: string[];
  };
}

export function messagesToPromptFactory(rolesOverride: Record<string, string | undefined> = {}) {
  const roles: Record<string, string> = pickBy(
    {
      system: "system",
      user: "user",
      assistant: "assistant",
      ...rolesOverride,
    },
    isDefined,
  );

  return (template: LLMChatPromptTemplate) => {
    return toBoundedFunction(
      (messages: BaseMessage[]) => {
        return template.render({
          messages: messages.map((message) =>
            Object.fromEntries(
              Object.entries(roles).map(([key, role]) =>
                message.role === role ? [key, [message.text]] : [key, []],
              ),
            ),
          ),
        });
      },
      [
        {
          name: "template",
          value: template,
        },
        {
          name: "roles",
          value: roles,
        },
      ],
    );
  };
}

export function templateSchemaFactory(roles: readonly string[]) {
  return z.object({
    messages: z.array(z.object(mapToObj(roles, (role) => [role, z.array(z.string())] as const))),
  });
}

const llama31: LLMChatTemplate = {
  template: new PromptTemplate({
    schema: templateSchemaFactory(["system", "user", "assistant", "ipython"] as const),
    template: `{{#messages}}{{#system}}<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{{system}}<|eot_id|>{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>

{{user}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>

{{assistant}}<|eot_id|>{{/assistant}}{{#ipython}}<|start_header_id|>ipython<|end_header_id|>

{{ipython}}<|eot_id|>{{/ipython}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>

`,
  }),
  messagesToPrompt: messagesToPromptFactory({ ipython: "ipython" }),
  parameters: {
    stop_sequence: ["<|eot_id|>"],
  },
};

const llama33: LLMChatTemplate = llama31;

const llama3: LLMChatTemplate = {
  template: new PromptTemplate({
    schema: templateSchemaFactory(["system", "user", "assistant"] as const),
    template: `{{#messages}}{{#system}}<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{{system}}<|eot_id|>{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>

{{user}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>

{{assistant}}<|eot_id|>{{/assistant}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>
`,
  }),
  messagesToPrompt: messagesToPromptFactory(),
  parameters: {
    stop_sequence: ["<|eot_id|>"],
  },
};

const granite31Instruct: LLMChatTemplate = {
  template: new PromptTemplate({
    schema: templateSchemaFactory([
      "system",
      "user",
      "assistant",
      "tools",
      "tool_call",
      "tool_response",
    ] as const),
    template: `{{#messages}}{{#system}}<|start_of_role|>system<|end_of_role|>
{{system}}<|end_of_text|>
{{ end }}{{/system}}{{#tools}}<|start_of_role|>tools<|end_of_role|>
{{tools}}<|end_of_text|>
{{ end }}{{/tools}}{{#user}}<|start_of_role|>user<|end_of_role|>
{{user}}<|end_of_text|>
{{ end }}{{/user}}{{#assistant}}<|start_of_role|>assistant<|end_of_role|>
{{assistant}}<|end_of_text|>
{{ end }}{{/assistant}}{{#tool_call}}<|start_of_role|>assistant<|end_of_role|><|tool_call|>
{{tool_call}}<|end_of_text|>
{{ end }}{{/tool_call}}{{#tool_response}}<|start_of_role|>tool_response<|end_of_role|>
{{tool_response}}<|end_of_text|>
{{ end }}{{/tool_response}}{{/messages}}<|start_of_role|>assistant<|end_of_role|>
`,
  }),
  messagesToPrompt: messagesToPromptFactory({
    tools: "tools",
    tool_response: "tool_response",
    tool_call: "tool_call",
  }),
  parameters: {
    stop_sequence: ["<|end_of_text|>"],
  },
};

export class LLMChatTemplates {
  protected static readonly registry = {
    "llama3.3": llama33,
    "llama3.1": llama31,
    "llama3": llama3,
    "granite3.1-Instruct": granite31Instruct,
  };

  static register(model: string, template: LLMChatTemplate, override = false) {
    if (model in this.registry && !override) {
      throw new ValueError(`Template for model '${model}' already exists!`);
    }
    this.registry[model as keyof typeof this.registry] = template;
  }

  static has(model: string): boolean {
    return Boolean(model && model in this.registry);
  }

  static get(model: keyof typeof LLMChatTemplates.registry): LLMChatTemplate;
  // eslint-disable-next-line @typescript-eslint/unified-signatures
  static get(model: string): LLMChatTemplate;
  static get(model: string): LLMChatTemplate {
    if (!this.has(model)) {
      throw new ValueError(`Template for model '${model}' not found!`, [], {
        context: {
          validModels: Object.keys(this.registry),
        },
      });
    }
    return this.registry[model as keyof typeof this.registry];
  }
}
