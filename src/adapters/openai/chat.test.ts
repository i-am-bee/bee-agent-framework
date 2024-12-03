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

import { verifyDeserialization } from "@tests/e2e/utils.js";
import { OpenAIChatLLM } from "@/adapters/openai/chat.js";
import { OpenAI, AzureOpenAI } from "openai";

describe("AzureOpenAI ChatLLM", () => {
  const getInstance = () => {
    return new OpenAIChatLLM({
      modelId: "gpt-4o",
      client: new AzureOpenAI(),
    });
  };

  it("Serializes", async () => {
    process.env["OPENAI_BASE_URL"] = "http://dummy/";
    process.env["AZURE_OPENAI_API_KEY"] = "123";
    process.env["OPENAI_API_VERSION"] = "version 1";
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = OpenAIChatLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});

describe("OpenAI ChatLLM", () => {
  const getInstance = () => {
    return new OpenAIChatLLM({
      modelId: "gpt-4o",
      client: new OpenAI({
        apiKey: "123",
      }),
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = OpenAIChatLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
