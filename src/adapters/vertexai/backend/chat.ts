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

import { GoogleVertexProvider } from "@ai-sdk/google-vertex";
import { VercelChatModel } from "@/adapters/vercel/backend/chat.js";
import { VertexAIClient, VertexAIClientSettings } from "@/adapters/vertexai/backend/client.js";
import { ChatModelSettings } from "@/backend/chat.js";
import { getEnv } from "@/internals/env.js";

type Params = Parameters<GoogleVertexProvider["languageModel"]>;
export type VertexAIChatSettings = NonNullable<Params[1]> & ChatModelSettings;

export class VertexAIChatModel extends VercelChatModel {
  constructor(
    modelId: string = getEnv("GOOGLE_VERTEX_API_CHAT_MODEL", "gemini-1.5-pro"),
    settings: VertexAIChatSettings = {},
    client?: VertexAIClientSettings | VertexAIClient,
  ) {
    const model = VertexAIClient.ensure(client).instance.languageModel(modelId, settings);
    super(model, settings);
  }
}
