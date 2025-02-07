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

import { createGroq, GroqProvider, GroqProviderSettings } from "@ai-sdk/groq";
import { BackendClient } from "@/backend/client.js";
import { getEnv } from "@/internals/env.js";

export type GroqClientSettings = GroqProviderSettings;

export class GroqClient extends BackendClient<GroqClientSettings, GroqProvider> {
  protected create(settings?: GroqClientSettings): GroqProvider {
    return createGroq({
      ...settings,
      baseURL: getEnv("GROQ_API_BASE_URL"),
      apiKey: getEnv("GROQ_API_KEY"),
    });
  }
}
