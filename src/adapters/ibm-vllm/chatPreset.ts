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

import { LLMChatTemplate, LLMChatTemplates } from "@/adapters/shared/llmChatTemplates.js";
import { z } from "zod";

import { IBMVllmInputConfig } from "./chat.js";
import { IBMvLLMInput } from "./llm.js";

import { PromptTemplate } from "@/template.js";

interface IBMVllmChatLLMPreset {
  chat: IBMVllmInputConfig;
  base: IBMvLLMInput;
}

export const IBMVllmModel = {
  LLAMA_3_1_405B_INSTRUCT_FP8: "meta-llama/llama-3-1-405b-instruct-fp8",
  LLAMA_3_1_70B_INSTRUCT: "meta-llama/llama-3-1-70b-instruct",
  QWEN2_72B_INSTRUCT: "qwen/qwen2-72b-instruct",
  GRANITE_INSTRUCT: "ibm/granite-instruct", // Generic model ID is used for ease of development, ground it once stable
} as const;
export type IBMVllmModel = (typeof IBMVllmModel)[keyof typeof IBMVllmModel];

export const IBMVllmChatLLMPreset = {
  [IBMVllmModel.LLAMA_3_1_405B_INSTRUCT_FP8]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("llama3.1");
    return {
      base: {
        modelId: IBMVllmModel.LLAMA_3_1_70B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
          decoding: {
            repetition_penalty: 1.03,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  [IBMVllmModel.LLAMA_3_1_70B_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("llama3.1");
    return {
      base: {
        modelId: IBMVllmModel.LLAMA_3_1_70B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
          decoding: {
            repetition_penalty: 1.03,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  [IBMVllmModel.QWEN2_72B_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("qwen2");
    return {
      base: {
        modelId: IBMVllmModel.QWEN2_72B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 1024,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  [IBMVllmModel.GRANITE_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const llama31config = LLMChatTemplates.get("llama3.1");
    const { template, parameters, messagesToPrompt } = {
      template: new PromptTemplate({
        schema: z.object({
          messages: z.array(
            z.object({
              system: z.array(z.string()),
              user: z.array(z.string()),
              assistant: z.array(z.string()),
              ipython: z.array(z.string()),
            }),
          ),
        }),
        template: `{{#messages}}{{#system}}<|start_of_role|>system<|end_of_role|>
    
    {{system}}<|end_of_text|>{{/system}}{{#user}}<|start_of_role|>user<|end_of_role|>
    
    {{user}}<|end_of_text|>{{/user}}{{#assistant}}<|start_of_role|>assistant<|end_of_role|>
    
    {{assistant}}<|end_of_text|>{{/assistant}}{{#ipython}}<|start_of_role|>ipython<|end_of_role|>
    
    {{ipython}}<|end_of_text|>{{/ipython}}{{/messages}}<|start_of_role|>assistant<|end_of_role|>
    `,
      }),
      messagesToPrompt: llama31config.messagesToPrompt,
      parameters: {
        stop_sequence: ["<|end_of_text|>"],
      },
    } satisfies LLMChatTemplate;
    return {
      base: {
        modelId: IBMVllmModel.GRANITE_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
} as const satisfies { [key in IBMVllmModel]: () => IBMVllmChatLLMPreset };

export type IBMVllmChatLLMPresetModel = keyof typeof IBMVllmChatLLMPreset;