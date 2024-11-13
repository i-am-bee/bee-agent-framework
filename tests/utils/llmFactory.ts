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

import { ChatLLM, ChatLLMOutput } from "@/llms/chat.js";
import process from "node:process";
import { BAMChatLLM } from "@/adapters/bam/chat.js";
import { OpenAIChatLLM } from "@/adapters/openai/chat.js";
import { WatsonXChatLLM } from "@/adapters/watsonx/chat.js";
import { GroqChatLLM } from "@/adapters/groq/chat.js";
import { OllamaChatLLM } from "@/adapters/ollama/chat.js";
import { Ollama } from "ollama";
import { Agent, Dispatcher } from "undici";

export function createChatLLM(): ChatLLM<ChatLLMOutput> {
  if (process.env.GENAI_API_KEY) {
    return BAMChatLLM.fromPreset("meta-llama/llama-3-1-70b-instruct");
  } else if (process.env.OPENAI_API_KEY) {
    return new OpenAIChatLLM({ modelId: "gpt-4o" });
  } else if (process.env.WATSONX_API_KEY && process.env.WATSONX_PROJECT_ID) {
    return WatsonXChatLLM.fromPreset("meta-llama/llama-3-70b-instruct", {
      projectId: process.env.WATSONX_PROJECT_ID,
      region: process.env.WATSONX_REGION,
    });
  } else if (process.env.GROQ_API_KEY) {
    return new GroqChatLLM({
      modelId: `llama-3.1-70b-versatile`,
      parameters: { temperature: 0 },
    });
  } else if (process.env.OLLAMA_HOST) {
    // the undici definition of RequestInit does not extend the default
    // fetch RequestInit so we can't use its type directly. Define
    // and interface that adds the field we need to the default fetch
    // interface to that we can make TypeScript accept it.
    interface UndiciRequestInit extends RequestInit {
      dispatcher: Dispatcher;
    }
    return new OllamaChatLLM({
      modelId: process.env.OLLAMA_MODEL ?? "llama3.1:8b",
      parameters: {
        temperature: 0,
      },
      client: new Ollama({
        host: process.env.OLLAMA_HOST,
        fetch: (input, init?) => {
          const someInit = init || {};
          const requestInit: UndiciRequestInit = {
            ...someInit,
            dispatcher: new Agent({ headersTimeout: 2700000 }),
          };
          return fetch(input, requestInit);
        },
      }),
    });
  } else {
    throw new Error("No API key for any LLM provider has been provided. Cannot run test case.");
  }
}
