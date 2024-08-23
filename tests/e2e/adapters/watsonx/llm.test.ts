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

import { WatsonXLLM, WatsonXLLMOutput } from "@/adapters/watsonx/llm.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";

const apiKey = process.env.WATSONX_API_KEY!;
const projectId = process.env.WATSONX_PROJECT_ID!;
const spaceId = process.env.WATSONX_SPACE_ID;
const deploymentId = process.env.WATSONX_DEPLOYMENT_ID;

describe.runIf(Boolean(apiKey && projectId))("WatsonX SDK LLM", () => {
  const createLLM = () => {
    return new WatsonXLLM({
      apiKey,
      projectId,
      modelId: "google/flan-ul2",
      spaceId,
      deploymentId,
      ...(deploymentId && {
        transform: ({ input, ...body }) => ({
          ...body,
          parameters: {
            ...body?.parameters,
            prompt_variables: { ...body?.parameters?.prompt_variables, name: input },
          },
        }),
      }),
    });
  };

  it("Meta", async () => {
    const llm = createLLM();
    const response = await llm.meta();
    expect(response.tokenLimit).toBeGreaterThan(0);
  });

  it("Generates", async () => {
    const llm = createLLM();
    const response = await llm.generate("Hello world!");
    expect(response).toBeInstanceOf(WatsonXLLMOutput);
  });

  it("Streams", async () => {
    const llm = createLLM();
    for await (const chunk of llm.stream("Hello world!")) {
      expect(chunk).toBeInstanceOf(WatsonXLLMOutput);
      expect(chunk.finalResult).toBeTruthy();
    }
  });

  it("Serializes", () => {
    const llm = createLLM();
    const serialized = llm.serialize();
    const deserialized = WatsonXLLM.fromSerialized(serialized);
    verifyDeserialization(llm, deserialized);
  });
});
