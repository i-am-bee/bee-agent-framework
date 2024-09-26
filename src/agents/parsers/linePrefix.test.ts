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

import { LinePrefixParser } from "@/agents/parsers/linePrefix.js";
import { z } from "zod";
import { JSONParserField, ZodParserField } from "@/agents/parsers/field.js";
import { splitString } from "@/internals/helpers/string.js";
import { ValueError } from "@/errors.js";

describe("LinePrefixParser", () => {
  it.each([1, 5, 20, 50, 100, 1000])("Handles arbitrary chunk size", async (chunkSize) => {
    const parser = new LinePrefixParser({
      thought: {
        prefix: "Thought:",
        next: ["tool_name", "final_answer"],
        isStart: true,
        field: new ZodParserField(z.string().min(1)),
      },
      tool_name: {
        prefix: "Tool Name:",
        next: ["tool_caption"],
        field: new ZodParserField(z.enum(["Google"])),
      },
      tool_caption: {
        prefix: "Tool Caption:",
        next: ["tool_input"],
        field: new ZodParserField(z.string().min(1)),
      },
      tool_input: {
        prefix: "Tool Input:",
        next: ["tool_output"],
        field: new JSONParserField({
          schema: z.record(z.string()),
          base: {},
        }),
      },
      tool_output: {
        prefix: "Tool Output:",
        next: ["final_answer"],
        isEnd: true,
        field: new JSONParserField({
          schema: z.record(z.string()),
          base: {},
        }),
      },
      final_answer: {
        prefix: "Final Answer:",
        next: [],
        isStart: true,
        isEnd: true,
        field: new ZodParserField(z.string().min(1)),
      },
    } as const);

    // Gather all update events and then compare if they equal the same
    const updates = {
      partial: {},
      final: {},
    };
    parser.emitter.on("update", async ({ key, field }) => {
      Object.assign(updates.final, { [key]: field.raw });
    });
    parser.emitter.on("partialUpdate", async ({ key, field }) => {
      Object.assign(updates.partial, { [key]: field.raw });
    });

    const chunks = splitString(
      `Thought: I don't know who is president of USA.
But I can use GoogleSearch to find out.
Tool Name: Google
Tool Caption: Searching for USA president
Tool Input: {"query":"USA president"}
Tool Output: {"answer":"Joe Biden"}
Final Answer: Joe Biden is the current president of USA.`,
      { size: chunkSize, overlap: 0 },
    );
    for (const chunk of chunks) {
      await parser.add(chunk);
    }
    const state = await parser.end();

    expect(state).toStrictEqual({
      thought: `I don't know who is president of USA.
But I can use GoogleSearch to find out.`,
      tool_name: "Google",
      tool_caption: "Searching for USA president",
      tool_input: { query: "USA president" },
      tool_output: { answer: "Joe Biden" },
      final_answer: "Joe Biden is the current president of USA.",
    });
    expect(updates.partial).toStrictEqual(updates.final);
  });

  describe("Streaming", () => {
    it("JSON", async () => {
      const parser = new LinePrefixParser({
        start: {
          prefix: "Start:",
          field: new JSONParserField({
            schema: z.object({
              a: z.number().int(),
              b: z.number().int(),
            }),
            base: {},
          }),
          next: [],
          isStart: true,
          isEnd: true,
        },
      } as const);
      await parser.add("Start:");

      for (const field of [
        {
          value: `{"a`,
          expected: {},
        },
        {
          value: `":1,`,
          expected: { a: 1 },
        },
        {
          value: `"b`,
          expected: { a: 1 },
        },
        {
          value: `":`,
          expected: { a: 1, b: undefined },
        },
        {
          value: `2,`,
          expected: { a: 1, b: 2 },
        },
      ]) {
        await Promise.all([
          new Promise<void>((resolve) => {
            parser.emitter.on(
              "partialUpdate",
              (update) => {
                expect(update.delta).toStrictEqual(field.value);
                expect(update.field.getPartial()).toStrictEqual(field.expected);
                resolve();
              },
              {
                once: true,
                isBlocking: true,
              },
            );
          }),
          parser.add(field.value),
        ]);
      }
      await parser.end();
    });
  });

  describe("Edge cases", () => {
    it("Prevents processing when line starts with a potential prefix", async () => {
      const parser = new LinePrefixParser({
        final_answer: {
          prefix: "Final Answer:",
          field: new ZodParserField(z.string()),
          isStart: true,
          isEnd: true,
          next: [],
        },
        final_detail: {
          prefix: "Final Detail:",
          field: new ZodParserField(z.string()),
          isStart: true,
          isEnd: true,
          next: [],
        },
      });

      const deltas: string[] = [];
      parser.emitter.on("partialUpdate", ({ key, delta }) => {
        expect(key).toStrictEqual("final_answer");
        deltas.push(delta);
      });
      await parser.add("Final Answer: 4\n");
      await parser.add("\n"); // we can stream for multiple lines
      expect(deltas.join("")).toStrictEqual("4\n");
      expect(deltas.length).toBe(2);
      await parser.add("Final ");
      expect(deltas.length).toBe(2);
      await parser.add("Detail");
      expect(deltas.length).toBe(2);
      await parser.end();
      expect(deltas.join("")).toStrictEqual("4\n\nFinal Detail");
      expect(deltas.length).toBe(3);
    });
  });

  describe("Error handling", () => {
    it("Throws when no node is provided", () => {
      expect(() => new LinePrefixParser({})).toThrowError(ValueError);
    });

    it("Throws when no start node is provided", () => {
      expect(
        () =>
          new LinePrefixParser({
            a: {
              prefix: "A:",
              isStart: false,
              isEnd: true,
              next: [],
              field: new ZodParserField(z.string()),
            },
          }),
      ).toThrowErrorMatchingInlineSnapshot(`ValueError: At least one start node must be provided!`);
    });

    it("Throws when no start node is provided", () => {
      expect(
        () =>
          new LinePrefixParser({
            a: {
              prefix: "A:",
              isStart: true,
              isEnd: false,
              next: [],
              field: new ZodParserField(z.string()),
            },
          }),
      ).toThrowErrorMatchingInlineSnapshot(`ValueError: At least one end node must be provided!`);
    });

    it("Throws for non-existing transition", () => {
      expect(
        () =>
          new LinePrefixParser({
            a: {
              prefix: "A:",
              isStart: true,
              isEnd: true,
              next: ["b"] as any[],
              field: new ZodParserField(z.string()),
            },
          }),
      ).toThrowErrorMatchingInlineSnapshot(
        `ValueError: Node 'a' contains a transition to non-existing node 'b'.`,
      );
    });

    it("Throws when self-reference", () => {
      expect(
        () =>
          new LinePrefixParser({
            a: {
              prefix: "A:",
              isStart: true,
              isEnd: true,
              next: ["a"],
              field: new ZodParserField(z.string()),
            },
          }),
      ).toThrowErrorMatchingInlineSnapshot(`ValueError: Node 'a' cannot point to itself.`);
    });
  });
});
