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

import { VercelChatModel } from "@/adapters/vercel/backend/chat.js";
import { GroqProvider } from "@/adapters/groq/backend/provider.js";
import { GroqProviderSettings } from "@ai-sdk/groq";
import { createGroqClient } from "@/adapters/groq/backend/client.js";

type Params = Parameters<GroqProvider["chatModel"]>;
export type GroqModelId = string;
export type GroqChatSettings = NonNullable<Params[1]>;

export class GroqChatModel extends VercelChatModel {
  constructor(
    modelId: GroqModelId,
    settings?: GroqChatSettings,
    clientSettings?: GroqProviderSettings,
  ) {
    const client = createGroqClient(clientSettings);
    const model = client.languageModel(modelId, settings);
    super(model);
  }
}
