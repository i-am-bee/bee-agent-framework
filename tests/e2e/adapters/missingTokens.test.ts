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

import { IBMvLLM } from "@/adapters/ibm-vllm/llm.js";
import { BAMLLM } from "@/adapters/bam/llm.js";
import { BaseLLM, BaseLLMOutput, LLMError } from "@/llms/base.js";
import * as R from "remeda";

const createLLM = (type: "bam" | "vllm") => {
  switch (type) {
    case "bam":
      return new BAMLLM({
        modelId: "meta-llama/llama-3-1-70b-instruct",
        parameters: {
          decoding_method: "greedy",
          include_stop_sequence: false,
          max_new_tokens: 2048,
          repetition_penalty: 1,
          stop_sequences: ["<|eot_id|>"],
        },
      });
    case "vllm":
      return new IBMvLLM({
        modelId: "meta-llama/llama-3-1-70b-instruct",
        parameters: {
          method: "GREEDY",
          stopping: {
            stop_sequences: ["<|eot_id|>"],
            include_stop_sequence: false,
            max_new_tokens: 2048,
          },
          decoding: {
            repetition_penalty: 1,
          },
        },
      });
  }
};

async function generateText(
  prompt: string,
  llm: BaseLLM<string, BaseLLMOutput>,
  stream: boolean,
  numRetries = 5,
) {
  let answer: string;
  for (let j = 0; j < numRetries; j++) {
    const text = [];
    try {
      if (stream) {
        for await (const chunk of llm.stream(prompt)) {
          text.push(chunk.getTextContent());
        }
        return text.join("");
      } else {
        return (await llm.generate(prompt)).getTextContent();
      }
    } catch (err) {
      console.warn("network error");
    }
  }
  throw new LLMError("network error");
}

describe("missing tokens", () => {
  it.each([
    { llm: "bam" as const, stream: true },
    { llm: "vllm" as const, stream: true },
    { llm: "bam" as const, stream: false },
    { llm: "vllm" as const, stream: false },
  ])(
    "Has no missing tokens llm: (%s)",
    async ({ llm: llmType, stream }) => {
      const llm = createLLM(llmType);
      const iterations = 500;
      const repeatText = "I will never miss any tokens.";
      const times = 19;
      const prompt = `Write the following phrase exactly ${times + 1} times: '${repeatText}'\n1: ${repeatText}\n2: `;
      console.log(llm.constructor.name);

      const chunks = R.chunk(R.range(0, iterations), 5);
      for (const chunk of chunks) {
        const answers = await Promise.all(
          chunk.map(async (i) => {
            console.log(`iteration: ${i}`);
            return await generateText(prompt, llm, stream);
          }),
        );
        for (const answer of answers) {
          const count = answer.split(repeatText).length - 1;
          expect(count, "LLM repeated tokens:" + prompt + answer).toBe(times);
        }
      }
    },
    { timeout: 120_000_000 },
  );
});
