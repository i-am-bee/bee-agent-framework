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
import { LLMMeta } from "@/llms/base.js";

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

export function extractModelMeta(response: ShowResponse): LLMMeta {
  console.info(response.model_info);
  const tokenLimit = Object.entries(response.model_info)
    .find(([k]) => k.includes("context_length") || k.includes("max_sequence_length"))
    ?.at(1);

  return {
    tokenLimit: tokenLimit || Infinity,
  };
}
