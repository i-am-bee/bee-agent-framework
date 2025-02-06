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

import { BedrockClient, BedrockClientSettings } from "@/adapters/bedrock/backend/client.js";
import { VercelChatModel } from "@/adapters/vercel/backend/chat.js";
import { getEnv } from "@/internals/env.js";
import { AmazonBedrockProvider } from "@ai-sdk/amazon-bedrock";

type BedrockParameters = Parameters<AmazonBedrockProvider["languageModel"]>;
export type BedrockChatModelId = NonNullable<BedrockParameters[0]>;
export type BedrockChatModelSettings = NonNullable<BedrockParameters[1]>;

export class BedrockChatModel extends VercelChatModel {
  constructor(
    modelId: BedrockChatModelId = getEnv("BEDROCK_API_CHAT_MODEL", "meta.llama3-70b-instruct-v1:0"),
    settings: BedrockChatModelSettings = {},
    client?: BedrockClient | BedrockClientSettings,
  ) {
    const model = BedrockClient.ensure(client).instance.languageModel(modelId, settings);
    super(model);
  }
}
