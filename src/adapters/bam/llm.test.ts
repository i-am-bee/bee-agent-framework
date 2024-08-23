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

import { BAMLLMOutput, BAMLLMOutputModeration, BAMLLMOutputResult } from "@/adapters/bam/llm.js";
import { expect } from "vitest";
import { LLMOutputError } from "@/llms/base.js";
import { verifyDeserialization } from "@tests/e2e/utils.js";

describe("SDK LLM Output", () => {
  const generateModeration = (
    i: number,
    override: Record<string, any> = {},
  ): NonNullable<NonNullable<BAMLLMOutputModeration>["hap"]>[number] => {
    return {
      success: true,
      position: { start: i, end: i },
      score: 0.75,
      flagged: true,
      ...override,
    };
  };

  const generateChunks = (count: number): BAMLLMOutputResult[] => {
    return Array(count)
      .fill(null)
      .map(
        (_, i): BAMLLMOutputResult => ({
          generated_text: `Text ${i}`,
          generated_token_count: 3,
          moderations: undefined,
          ...(i % 2 === 0 && {
            moderations: {
              ...(i % 3 === 0 && {
                hap: [
                  generateModeration(i, { score: 0.98, success: false }),
                  generateModeration(i, { score: 0.33 }),
                ],
              }),
              social_bias: [
                generateModeration(i, { score: 0.99, success: false }),
                generateModeration(i, { score: 0.77 }),
              ],
            },
          }),
          stop_reason: "not_finished",
          ...(i === 0 && {
            input_text: "Hello world!",
            input_token_count: 4,
          }),
          ...(i + 1 === count && {
            stop_reason: "max_tokens",
          }),
          seed: 1230,
        }),
      );
  };

  const getInstance = (
    chunks: BAMLLMOutputResult[],
    moderations?: BAMLLMOutputModeration | BAMLLMOutputModeration[],
  ) => {
    return new BAMLLMOutput({
      results: chunks,
      moderations,
      meta: {
        id: "X",
        model_id: "model",
        input_parameters: undefined,
        created_at: new Date().toISOString(),
      },
    });
  };

  describe("Merging", () => {
    it("Throws for no chunks", () => {
      const chunks = generateChunks(0);
      const instance = getInstance(chunks);
      expect(() => instance.finalResult).toThrowError(LLMOutputError);
    });

    it("Single instance", () => {
      const chunks = generateChunks(1);
      const instance = getInstance(chunks);
      expect(instance.finalResult).toStrictEqual(chunks[0]);
    });

    it.each([2, 5, 6, 10])("Multiple chunks (%i)", (chunksCount) => {
      const chunks = generateChunks(chunksCount);
      const instance = getInstance(chunks);

      const finalResult = instance.finalResult;
      expect(finalResult).toMatchSnapshot();

      const finalModerations = instance.finalModeration;
      expect(finalModerations).toMatchSnapshot();
    });

    it("Merges moderations", () => {
      const chunks = generateChunks(1);
      const moderations = {
        hap: [generateModeration(777)],
        social_bias: [generateModeration(888)],
      };
      const instance = getInstance(chunks, moderations);

      const finalResult = instance.finalResult;
      expect(finalResult).toMatchSnapshot();

      const finalModerations = instance.finalModeration;
      expect(finalModerations).toMatchSnapshot();
    });
  });

  describe("Caching", () => {
    it("Caches final result", () => {
      const [firstChunk, ...chunks] = generateChunks(5);
      const instance = getInstance([firstChunk, ...chunks]);

      const result = instance.finalResult;
      expect(result).toBeTruthy();
      Object.defineProperty(firstChunk, "generated_text", {
        get() {
          throw new Error("This should not be called!");
        },
      });
      expect(instance.finalResult).toBe(result);
      expect(instance.getTextContent()).toBeTruthy();
    });

    it("Revalidates cache", () => {
      const instance = getInstance(generateChunks(5));

      const result = instance.finalResult;
      expect(instance.finalResult).toBe(result);
      expect(instance.finalResult).toBe(result);
      instance.merge(getInstance(generateChunks(1)));

      const newResult = instance.finalResult;
      expect(newResult).not.toBe(result);
      expect(instance.finalResult).toBe(newResult);
    });
  });

  it("Serializes", () => {
    const instance = getInstance(generateChunks(5));
    const serialized = instance.serialize();
    const deserialized = BAMLLMOutput.fromSerialized(serialized);
    verifyDeserialization(instance, deserialized);
  });
});
