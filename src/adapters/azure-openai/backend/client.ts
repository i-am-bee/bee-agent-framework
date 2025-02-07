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

import { AzureOpenAIProvider, AzureOpenAIProviderSettings, createAzure } from "@ai-sdk/azure";
import { getEnv } from "@/internals/env.js";
import { BackendClient } from "@/backend/client.js";

export type AzureOpenAIClientSettings = AzureOpenAIProviderSettings;

export class AzureOpenAIClient extends BackendClient<
  AzureOpenAIClientSettings,
  AzureOpenAIProvider
> {
  protected create(options?: AzureOpenAIClientSettings): AzureOpenAIProvider {
    return createAzure({
      ...options,
      apiKey: options?.apiKey || getEnv("AZURE_OPENAI_API_KEY"),
      baseURL: options?.baseURL || getEnv("AZURE_OPENAI_API_ENDPOINT"),
      resourceName: options?.resourceName || getEnv("AZURE_OPENAI_API_RESOURCE"),
      apiVersion: options?.apiVersion || getEnv("AZURE_OPENAI_API_VERSION"),
    });
  }
}
