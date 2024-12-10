/**
 * Copyright 2024 IBM Corp.
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

import { Serializer } from "@/serializer/serializer.js";
import { Config, Ollama as Client, ShowResponse } from "ollama";
import { getPropStrict } from "@/internals/helpers/object.js";
import { GuidedOptions, LLMMeta } from "@/llms/base.js";
import { Comparator, compareVersion } from "@/internals/helpers/string.js";
import { isString } from "remeda";

export function registerClient() {
  Serializer.register(Client, {
    toPlain: (value) => ({
      config: getPropStrict(value, "config") as Config,
      fetch: getPropStrict(value, "fetch"),
    }),
    fromPlain: (value) =>
      new Client({
        fetch: value.fetch ?? value.config.fetch,
        host: value.config.host,
        proxy: value.config.proxy,
      }),
  });
}

export async function retrieveVersion(
  baseUrl: string,
  client: typeof fetch = fetch,
): Promise<string> {
  const url = new URL("/api/version", baseUrl);
  const response = await client(url);
  if (!response.ok) {
    throw new Error(`Could not retrieve Ollama API version.`);
  }
  const data = await response.json();
  return data.version;
}

export function retrieveFormat(
  version: string | number,
  guided?: GuidedOptions,
): string | object | undefined {
  if (!guided?.json) {
    return undefined;
  }

  if (compareVersion(String(version), Comparator.GTE, "0.5.0")) {
    return isString(guided.json) ? JSON.parse(guided.json) : guided.json;
  } else {
    return "json";
  }
}

export function extractModelMeta(response: ShowResponse): LLMMeta {
  const tokenLimit = Object.entries(response.model_info)
    .find(([k]) => k.includes("context_length") || k.includes("max_sequence_length"))
    ?.at(1);

  return {
    tokenLimit: tokenLimit || Infinity,
  };
}
