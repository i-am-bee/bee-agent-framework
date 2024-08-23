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

import { BAMChatLLMInputConfig } from "@/adapters/bam/chat.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { PromptTemplate } from "@/template.js";
import { BAMLLMInput } from "@/adapters/bam/llm.js";
import { toBoundedFunction } from "@/serializer/utils.js";

interface BAMChatLLMPreset {
  chat: BAMChatLLMInputConfig;
  base: Omit<BAMLLMInput, "client" | "modelId">;
}

export const BAMChatLLMPreset = {
  "meta-llama/llama-3-1-70b-instruct": (): BAMChatLLMPreset => {
    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          include_stop_sequence: false,
          max_new_tokens: 2048,
          repetition_penalty: 1.03,
          stop_sequences: ["<|eot_id|>"],
        },
      },
      chat: {
        messagesToPrompt: toBoundedFunction(
          (messages: BaseMessage[]) => {
            const template = new PromptTemplate({
              variables: ["messages"],
              template: `{{#messages}}{{#system}}<|begin_of_text|><|start_header_id|>system<|end_header_id|>

{{system}}<|eot_id|>{{/system}}{{#user}}<|start_header_id|>user<|end_header_id|>

{{user}}<|eot_id|>{{/user}}{{#assistant}}<|start_header_id|>assistant<|end_header_id|>

{{assistant}}<|eot_id|>{{/assistant}}{{#ipython}}<|start_header_id|>ipython<|end_header_id|>

{{ipython}}<|eot_id|>{{/ipython}}{{/messages}}<|start_header_id|>assistant<|end_header_id|>
`,
            });
            return template.render({
              messages: messages.map((message) => ({
                system: message.role === "system" ? [message.text] : [],
                user: message.role === "user" ? [message.text] : [],
                assistant: message.role === "assistant" ? [message.text] : [],
                ipython: message.role === "ipython" ? [message.text] : [],
              })),
            });
          },
          [PromptTemplate],
        ),
      },
    };
  },
  "qwen/qwen2-72b-instruct": (): BAMChatLLMPreset => {
    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          include_stop_sequence: false,
          stop_sequences: ["<|im_end|>"],
        },
      },
      chat: {
        messagesToPrompt: toBoundedFunction(
          (messages: BaseMessage[]) => {
            const template = new PromptTemplate({
              variables: ["messages"],
              template: `{{#messages}}{{#system}}<|im_start|>system
{{system}}<|im_end|>
{{ end }}{{/system}}{{#user}}<|im_start|>user
{{user}}<|im_end|>
{{ end }}{{/user}}{{#assistant}}<|im_start|>assistant
{{assistant}}<|im_end|>
{{ end }}{{/assistant}}{{/messages}}<|im_start|>assistant
`,
            });

            return template.render({
              messages: messages.map((message) => ({
                system: message.role === "system" ? [message.text] : [],
                user: message.role === "user" ? [message.text] : [],
                assistant: message.role === "assistant" ? [message.text] : [],
              })),
            });
          },
          [PromptTemplate],
        ),
      },
    };
  },
} as const;

export type BAMChatLLMPresetModel = keyof typeof BAMChatLLMPreset;
