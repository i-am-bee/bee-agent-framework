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

import { createBedrockClient } from "@/adapters/bedrock/backend/client.js";
import { BedrockProvider } from "@/adapters/bedrock/backend/provider.js";
import { AmazonBedrockProviderSettings } from "@ai-sdk/amazon-bedrock";
import { VercelChatModel } from "@/adapters/vercel/backend/chat.js";

type Params = Parameters<BedrockProvider["chatModel"]>;
export type BedrockModelId = string;
export type BedrockChatSettings = NonNullable<Params[1]>;

export class BedrockChatModel extends VercelChatModel {
  constructor(
    modelId: BedrockModelId,
    settings?: BedrockChatSettings,
    clientSettings?: AmazonBedrockProviderSettings,
  ) {
    const client = createBedrockClient(clientSettings);
    const model = client.languageModel(modelId, settings);
    super(model);
  }
}
