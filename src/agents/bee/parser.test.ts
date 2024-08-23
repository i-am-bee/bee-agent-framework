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

import { BeeOutputParser, BeeOutputParserError } from "@/agents/bee/parser.js";
import * as R from "remeda";

import { omitEmptyValues } from "@/internals/helpers/object.js";
import { expect } from "vitest";

describe("Bee Parser", () => {
  describe("Parsing", () => {
    it("Basics", async () => {
      const parser = new BeeOutputParser({});
      await parser.add("Final Answer: I need to find the current president of the Czech Republic.");
      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchInlineSnapshot(`
      {
        "final_answer": "I need to find the current president of the Czech Republic.",
      }
    `);
    });

    it("Ends up with the same result", async () => {
      const partial = new Map();
      const final = new Map();

      const parser = new BeeOutputParser();
      parser.emitter.on("update", async ({ update, type }) => {
        if (type === "full") {
          final.set(update.key, update.value);
        } else {
          partial.set(update.key, (partial.get(update.key) ?? "").concat(update.value));
        }
      });
      await parser.add("Thought: I ");
      await parser.add("will do it.");
      await parser.finalize();
      parser.validate();
      expect(partial).toStrictEqual(final);
    });

    it("Parses chunked JSON", async () => {
      const parser = new BeeOutputParser({});
      await parser.add("Tool Name:\n");
      await parser.add("Goo");
      await parser.add("gle");
      await parser.add("\n");
      await parser.add("Tool ");
      await parser.add("Input:\n");
      await parser.add('{"query');
      await parser.add('": "Czech President"');
      await parser.add("}");
      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchInlineSnapshot(`
        {
          "tool_input": {
            "query": "Czech President",
          },
          "tool_name": "Google",
        }
      `);
    });

    it("Handles newlines", async () => {
      const parser = new BeeOutputParser({
        allowMultiLines: true,
        preserveNewLines: false,
        trimContent: true,
      });
      await parser.add("Final Answer:\n\nI need to find\n\n the fastest car.   \n ");
      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchInlineSnapshot(`
        {
          "final_answer": "I need to find the fastest car.",
        }
      `);
    });

    it("Ignores newlines before first keyword occurrence", async () => {
      const parser = new BeeOutputParser();
      await parser.add("");
      await parser.add(" \n");
      await parser.add(" \n       ");
      await parser.add("");
      await parser.add("\n Final Answer: Hello");
      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchInlineSnapshot(`
        {
          "final_answer": "Hello",
        }
      `);
    });

    it("Handles newlines with custom settings", async () => {
      const parser = new BeeOutputParser({
        allowMultiLines: true,
        preserveNewLines: true,
        trimContent: true,
      });
      await parser.add("Final Answer:\n\nI need to find\n\n the fastest car.   \n ");
      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchInlineSnapshot(`
        {
          "final_answer": "I need to find
         the fastest car.",
        }
      `);
    });
  });

  describe("Chunking", () => {
    it.each([
      "  F#inal #answer : #I need to# search #Colorado, find#\n#\n the\n #area th#at th#e easter#n secto#r of# the Colora#do ex#tends i#nto, then find th#e elev#ation# #range #of the area.\n\n\n\nExtra Content.",
      "\nfinal answer:A#B#C###",
    ])("Text", async (text) => {
      const parser = new BeeOutputParser({
        allowMultiLines: true,
        preserveNewLines: true,
        trimContent: false,
      });

      const chunks = text.split("#");
      for (const chunk of chunks) {
        await parser.add(chunk);
      }

      await parser.finalize();
      parser.validate();

      const result = R.pipe(parser.parse(), R.pickBy(R.isTruthy));
      expect(result).toMatchSnapshot();
    });
  });

  describe("Validation", () => {
    it("Throws when no data passed", () => {
      const parser = new BeeOutputParser();
      expect(omitEmptyValues(parser.parse())).toStrictEqual({});
      expect(() => parser.validate()).toThrowError(BeeOutputParserError);
    });

    it.each(["Hello\nWorld", "Tool{\nxxx", "\n\n\nT"])(
      "Throws on invalid data (%s)",
      async (chunk) => {
        const parser = new BeeOutputParser({
          allowMultiLines: false,
        });
        await expect(parser.add(chunk)).rejects.toThrowError(BeeOutputParserError);
        await expect(parser.finalize()).rejects.toThrowError(BeeOutputParserError);
        expect(() => parser.validate()).toThrowError(BeeOutputParserError);
      },
    );
  });
});
