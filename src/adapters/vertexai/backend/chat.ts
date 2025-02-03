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

import { GoogleVertexProvider, GoogleVertexProviderSettings } from "@ai-sdk/google-vertex";
import { createVercelAIChatProvider } from "@/adapters/vercel/backend/chat.js";
import { BackendProviderConfig } from "@/backend/constants.js";
import { createVertexAIClient } from "@/adapters/vertexai/backend/client.js";

type Params = Parameters<GoogleVertexProvider["languageModel"]>;
export type VertexAIModelId = NonNullable<Params[0]>;
export type VertexAIChatSettings = NonNullable<Params[1]>;

export const VertexAIChatModel = createVercelAIChatProvider(
  BackendProviderConfig.VertexAI,
  (
    modelId: VertexAIModelId,
    settings?: VertexAIChatSettings,
    clientSettings?: GoogleVertexProviderSettings,
  ) => {
    const client = createVertexAIClient(clientSettings);
    return client.languageModel(modelId, settings);
  },
);
