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
import { BedrockChatLLM } from "@/adapters/bedrock/chat.js";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

describe("Bedrock ChatLLM", () => {
  const getInstance = () => {
    return new BedrockChatLLM({
      modelId: "amazon.titan-text-lite-v1",
      client: new BedrockRuntimeClient({ region: "us-east-1" }),
    });
  };

  it("Serializes", async () => {
    const instance = getInstance();
    const serialized = instance.serialize();
    const deserialized = BedrockChatLLM.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
