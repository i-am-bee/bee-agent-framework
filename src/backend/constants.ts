/**
 * Copyright 2025 IBM Corp.
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

export const BackendProviders = {
  OpenAI: { name: "OpenAI", module: "openai" },
  Azure: { name: "Azure", module: "azure" },
  WatsonX: { name: "WatsonX", module: "watsonx" },
  Ollama: { name: "Ollama", module: "ollama" },
  VertexAI: { name: "VertexAI", module: "vertexai" },
  Bedrock: { name: "Bedrock", module: "bedrock" },
  Groq: { name: "Groq", module: "groq" },
  Dummy: { name: "Dummy", module: "dummy" },
} as const;

export type ProviderName = (typeof BackendProviders)[keyof typeof BackendProviders]["module"];
export type ProviderHumanName = (typeof BackendProviders)[keyof typeof BackendProviders]["name"];
export type ProviderDef = (typeof BackendProviders)[keyof typeof BackendProviders];
