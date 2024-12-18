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
import { WatsonXLLMInput } from "@/adapters/watsonx/llm.js";
import { WatsonXChatLLMInputConfig } from "@/adapters/watsonx/chat.js";

interface WatsonXChatLLMPreset {
  chat: WatsonXChatLLMInputConfig;
  base: Omit<WatsonXLLMInput, "client" | "modelId">;
}

export const WatsonXChatLLMPreset = {
  "meta-llama/llama-3-3-70b-instruct": (): WatsonXChatLLMPreset => {
    const { template, messagesToPrompt, parameters } = LLMChatTemplates.get("llama3.3");

    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          include_stop_sequence: false,
          max_new_tokens: 2048,
          repetition_penalty: 1,
          stop_sequences: [...parameters.stop_sequence],
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  "ibm/granite-3-8b-instruct": (): WatsonXChatLLMPreset => {
    const { template, parameters, messagesToPrompt } = LLMChatTemplates.get("granite3.1-Instruct");
    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 2048,
          include_stop_sequence: false,
          stop_sequences: [...parameters.stop_sequence],
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  "ibm/granite-3-2b-instruct"() {
    return WatsonXChatLLMPreset["ibm/granite-3-8b-instruct"]();
  },
  "meta-llama/llama-3-1-70b-instruct": (): WatsonXChatLLMPreset => {
    const { template, messagesToPrompt, parameters } = LLMChatTemplates.get("llama3.1");

    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          include_stop_sequence: false,
          max_new_tokens: 2048,
          repetition_penalty: 1,
          stop_sequences: [...parameters.stop_sequence],
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  "meta-llama/llama-3-1-405b-instruct"() {
    return WatsonXChatLLMPreset["meta-llama/llama-3-1-70b-instruct"]();
  },
  "meta-llama/llama-3-1-8b-instruct"() {
    return WatsonXChatLLMPreset["meta-llama/llama-3-1-70b-instruct"]();
  },
  "meta-llama/llama-3-70b-instruct": (): WatsonXChatLLMPreset => {
    const { template, messagesToPrompt, parameters } = LLMChatTemplates.get("llama3");

    return {
      base: {
        parameters: {
          decoding_method: "greedy",
          max_new_tokens: 1500,
          include_stop_sequence: false,
          stop_sequences: [...parameters.stop_sequence],
        },
      },
      chat: {
        messagesToPrompt: messagesToPrompt(template),
      },
    };
  },
  "meta-llama/llama-3-8b-instruct"() {
    return WatsonXChatLLMPreset["meta-llama/llama-3-70b-instruct"]();
  },
} as const;

export type WatsonXChatLLMPresetModel = keyof typeof WatsonXChatLLMPreset;
