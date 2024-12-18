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

import { LLMChatTemplates } from "@/adapters/shared/llmChatTemplates.js";
import { IBMVllmInputConfig } from "./chat.js";
import { IBMvLLMInput } from "./llm.js";

interface IBMVllmChatLLMPreset {
  chat: IBMVllmInputConfig;
  base: IBMvLLMInput;
}

export const IBMVllmModel = {
  LLAMA_3_3_70B_INSTRUCT: "meta-llama/llama-3-3-70b-instruct",
  LLAMA_3_1_405B_INSTRUCT_FP8: "meta-llama/llama-3-1-405b-instruct-fp8",
  LLAMA_3_1_70B_INSTRUCT: "meta-llama/llama-3-1-70b-instruct",
  LLAMA_3_1_8B_INSTRUCT: "meta-llama/llama-3-1-8b-instruct",
  GRANITE_3_1_8B_INSTRUCT: "ibm-granite/granite-3-1-8b-instruct",
} as const;
export type IBMVllmModel = (typeof IBMVllmModel)[keyof typeof IBMVllmModel];

export const IBMVllmChatLLMPreset = {
  [IBMVllmModel.LLAMA_3_3_70B_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("llama3.3");
    return {
      base: {
        modelId: IBMVllmModel.LLAMA_3_3_70B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
          decoding: {
            repetition_penalty: 1,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
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
            repetition_penalty: 1,
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
            repetition_penalty: 1,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  [IBMVllmModel.LLAMA_3_1_8B_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("llama3");
    return {
      base: {
        modelId: IBMVllmModel.LLAMA_3_1_8B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  [IBMVllmModel.GRANITE_3_1_8B_INSTRUCT]: (): IBMVllmChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("granite3.1-Instruct");
    return {
      base: {
        modelId: IBMVllmModel.GRANITE_3_1_8B_INSTRUCT,
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: [...parameters.stop_sequence],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
} as const satisfies Record<IBMVllmModel, () => IBMVllmChatLLMPreset>;

export type IBMVllmChatLLMPresetModel = keyof typeof IBMVllmChatLLMPreset;
