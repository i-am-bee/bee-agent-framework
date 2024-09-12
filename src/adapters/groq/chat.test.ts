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
import { GroqChatLLM } from "@/adapters/groq/chat.js";
import { Groq } from "groq-sdk";

describe("Groq ChatLLM", () => {
  const getInstance = () => {
    return new GroqChatLLM({
      modelId: "gemma2-9b-it",
      client: new Groq({
        apiKey: "123",
      }),
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = GroqChatLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
