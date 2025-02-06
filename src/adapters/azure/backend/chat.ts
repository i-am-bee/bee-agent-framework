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
import { OpenAIChatSettings } from "@ai-sdk/openai/internal";
import { AzureOpenAIProviderSettings } from "@ai-sdk/azure";
import { AzureClient } from "@/adapters/azure/backend/client.js";
import { ChatModelSettings } from "@/backend/chat.js";
import { getEnv } from "@/internals/env.js";

export type AzureChatSettings = OpenAIChatSettings & ChatModelSettings;

export class AzureChatModel extends VercelChatModel {
  constructor(
    modelId: string = getEnv("AZURE_OPENAI_API_CHAT_DEPLOYMENT", "gpt-4o"),
    settings: AzureChatSettings = {},
    client?: AzureOpenAIProviderSettings | AzureClient,
  ) {
    const model = AzureClient.ensure(client).instance.chat(modelId, settings);
    super(model, settings);
  }
}
