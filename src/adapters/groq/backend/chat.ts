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
import { GroqClient, GroqClientSettings } from "@/adapters/groq/backend/client.js";
import { ChatModelSettings } from "@/backend/chat.js";
import { getEnv } from "@/internals/env.js";

export type GroqChatModelId = string;
export type GroqChatModelSettings = ChatModelSettings;

export class GroqChatModel extends VercelChatModel {
  constructor(
    modelId: GroqChatModelId = getEnv("GROQ_API_CHAT_MODEL", "gemma2-9b-it"),
    settings: GroqChatModelSettings = {},
    client?: GroqClient | GroqClientSettings,
  ) {
    const model = GroqClient.ensure(client).instance.languageModel(modelId);
    super(model, settings);
  }

  static {
    this.register();
  }
}
