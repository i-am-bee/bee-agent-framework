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
import { IBMvLLM, IBMvLLMOutput } from "@/adapters/ibm-vllm/llm.js";
import { IBMVllmModel } from "@/adapters/ibm-vllm/chatPreset.js";

describe.runIf(
  [
    process.env.IBM_VLLM_URL,
    process.env.IBM_VLLM_ROOT_CERT,
    process.env.IBM_VLLM_PRIVATE_KEY,
    process.env.IBM_VLLM_CERT_CHAIN,
  ].every((env) => Boolean(env)),
)("IBM vLLM", () => {
  const createLLM = (modelId: string = IBMVllmModel.LLAMA_3_1_70B_INSTRUCT) => {
    return new IBMvLLM({ modelId });
  };

  it("Meta", async () => {
    const llm = createLLM();
    const response = await llm.meta();
    expect(response.tokenLimit).toBeGreaterThan(0);
  });

  it("Generates", async () => {
    const llm = createLLM();
    const response = await llm.generate("Hello world!");
    expect(response).toBeInstanceOf(IBMvLLMOutput);
  });

  it("Streams", async () => {
    const llm = createLLM();
    for await (const chunk of llm.stream("Hello world!")) {
      expect(chunk).toBeInstanceOf(IBMvLLMOutput);
      expect(chunk.text).toBeTruthy();
    }
  });

  it("Embeds", async () => {
    const llm = createLLM("baai/bge-large-en-v1.5");
    const response = await llm.embed([`Hello world!`, `Hello family!`]);
    expect(response.embeddings.length).toBe(2);
    expect(response.embeddings[0].length).toBe(1024);
    expect(response.embeddings[1].length).toBe(1024);
  });

  it("Serializes", () => {
    const llm = createLLM();
    const serialized = llm.serialize();
    const deserialized = IBMvLLM.fromSerialized(serialized);
    verifyDeserialization(llm, deserialized);
  });
});
