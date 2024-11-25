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

import { VertexAILLM, VertexAILLMOutput } from "@/adapters/vertexai/llm.js";
import { getEnv } from "@/internals/env.js";

const project = getEnv("GCP_VERTEXAI_PROJECT");
const location = getEnv("GCP_VERTEXAI_LOCATION");

describe.runIf(Boolean(project && location && getEnv("GOOGLE_APPLICATION_CREDENTIALS")))(
  "GCP Vertex AI",
  () => {
    const createLLM = () => {
      return new VertexAILLM({
        modelId: "gemini-1.5-flash-001",
        project: project,
        location: location,
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
      expect(response).toBeInstanceOf(VertexAILLMOutput);
    });

    it("Streams", async () => {
      const llm = createLLM();
      for await (const chunk of llm.stream("Hello world!")) {
        expect(chunk).toBeInstanceOf(VertexAILLMOutput);
        expect(chunk.toString()).toBeTruthy();
      }
    });
  },
);
