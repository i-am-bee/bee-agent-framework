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

import { getEnv, parseEnv } from "@/internals/env.js";
import { createOpenAI, OpenAIProviderSettings } from "@ai-sdk/openai";
import { z } from "zod";

export function createOpenAIClient(options?: OpenAIProviderSettings) {
  const extraHeaders = parseEnv(
    "OPENAI_API_HEADERS",
    z.preprocess((value) => {
      return Object.fromEntries(
        String(value || "")
          .split(",")
          .filter((pair) => pair.includes("="))
          .map((pair) => pair.split("=")),
      );
    }, z.record(z.string())),
  );

  return createOpenAI({
    ...options,
    compatibility: "compatible",
    apiKey: options?.apiKey || getEnv("OPENAI_API_KEY"),
    baseURL: options?.baseURL || getEnv("OPENAI_API_ENDPOINT"),
    headers: {
      ...extraHeaders,
      ...options?.headers,
    },
  });
}
