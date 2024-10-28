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

import { Serializer } from "@/serializer/serializer.js";
import * as R from "remeda";
import { FrameworkError } from "@/errors.js";
import { AgentError } from "@/agents/base.js";
import { BaseMessage } from "@/llms/primitives/message.js";
import { beforeEach, expect, vi } from "vitest";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { BAMLLM } from "@/adapters/bam/llm.js";
import { BAMChatLLM } from "@/adapters/bam/chat.js";
import { SerializerError } from "@/serializer/error.js";
import { ValueOf } from "@/internals/types.js";
import { toBoundedFunction } from "@/serializer/utils.js";

describe("Serializer", () => {
  it.each([
    1,
    true,
    false,
    null,
    undefined,
    BigInt(100),
    "",
    {},
    { a: "a", b: true },
    [],
    [null, 1, null],
    [1, 2, 3],
    [1, "2", true, false],
    Infinity,
    -Infinity,
    new RegExp(/.+/),
    new Error("ohh no!"),
    new FrameworkError(":(", [], {
      isFatal: true,
      isRetryable: true,
    }),
    new AgentError("Agent went wrong."),
    /.+/g,
    () => 1,
    (...args: string[]) => {
      return args;
    },
    function (arg: string) {
      return arg;
    },
    function echo(arg: string) {
      return arg;
    },
    async function echoCurry(arg: string) {
      return async () => arg;
    },
    function* () {},
    function* xxx() {},
    new Date(),
    new Set([1, "1", null]),
    {
      a: { b: { c: { d: { e: { f: { g: { e: { h: { value: 1, name: "X" } } } } } } } } },
    },
  ])("Handles basics '%s'", (value) => {
    const json = Serializer.serialize(value);
    const deserialized = Serializer.deserialize(json);

    if (R.isFunction(value)) {
      expect(String(deserialized)).toStrictEqual(String(value));
    } else {
      expect(deserialized).toEqual(value);
    }
  });

  it("Handles various function definitions", () => {
    const inputs = {
      value: 10,
      a(input: unknown) {
        return [input, this?.value];
      },
      a1: function aX(input: unknown) {
        return [input, this?.value];
      },
      a2: function (input: unknown) {
        return [input, this?.value];
      },
      b: (input: unknown) => {
        return [input];
      },
      b1: async (input: unknown) => {
        return [input];
      },
      b2: async function bX(input: unknown) {
        return [input, this?.value];
      },
      b3: async function (input: unknown) {
        return [input, this?.value];
      },
      async b4(input: unknown) {
        return [input, this?.value];
      },
      *c(input: unknown) {
        yield [input, this?.value];
      },
      c1: function* cX(input: unknown) {
        yield [input, this?.value];
      },
      c2: function* (input: unknown) {
        yield [input, this?.value];
      },
      d: (input: unknown) => {
        return input;
      },
      d2: async (input: unknown) => {
        return input;
      },
      x(input: string): string {
        return (() => input)();
      },
      y: (a: string) => (b: string) => a + b,
    } as const;

    const serialized = Serializer.serialize(inputs);
    const deserialized: typeof inputs = Serializer.deserialize(serialized);
    expect(deserialized).toMatchInlineSnapshot(`
      {
        "a": [Function],
        "a1": [Function],
        "a2": [Function],
        "b": [Function],
        "b1": [Function],
        "b2": [Function],
        "b3": [Function],
        "b4": [Function],
        "c": [Function],
        "c1": [Function],
        "c2": [Function],
        "d": [Function],
        "d2": [Function],
        "value": 10,
        "x": [Function],
        "y": [Function],
      }
    `);

    for (const [key, fn] of R.entries(inputs)) {
      const target: typeof fn = deserialized[key];
      verifyDeserialization(fn, target);

      if (R.isFunction(fn) && R.isFunction(target)) {
        const l = fn("A");
        const r = target("A");

        if (R.isFunction(l) && R.isFunction(r)) {
          expect(l("B")).toEqual(r("B"));
        } else {
          expect(fn("A")).toEqual(target("A"));
        }
      } else {
        expect(fn).toBe(target);
      }
    }
  });

  it("Handles circular dependencies", () => {
    const a = { name: "A" };
    const b = { name: "B" };
    Object.assign(a, { b });
    Object.assign(b, { a });

    const input = { a, b };
    const json = Serializer.serialize(input);
    const deserialized = Serializer.deserialize(json);
    expect(deserialized).toStrictEqual(input);
  });

  it("Preserves references", () => {
    const a = { name: "A" };
    const b = { name: "B", a };
    const c = { name: "C", a, b };
    const d = { name: "C", a, b, c };

    const input = { a, b, c, d };
    const json = Serializer.serialize(input);
    const deserialized = Serializer.deserialize(json);

    expect([b.a, c.a, d.a].every((v) => v === a)).toBeTruthy();
    expect([c.b, d.b].every((v) => v === b)).toBeTruthy();
    expect([d.c].every((v) => v === c)).toBeTruthy();
    expect(deserialized).toStrictEqual(input);
  });

  it("Handles self referencing", () => {
    const a = { name: "A" };
    Object.assign(a, { a, b: a, c: a });

    const input = { a };
    const json = Serializer.serialize(input);
    const deserialized = Serializer.deserialize(json);

    expect(deserialized).toStrictEqual(input);
    expect(deserialized.a === deserialized.a.a).toBeTruthy();
    expect(deserialized.a === deserialized.a.b).toBeTruthy();
    expect(deserialized.a === deserialized.a.c).toBeTruthy();
  });

  describe("Loading", () => {
    const json = JSON.stringify({
      __version: "0.0.0",
      __root: {
        message: {
          __value: {
            role: "system",
            text: "a",
            meta: { __value: {}, __serializer: true, __class: "Object", __ref: "2" },
          },
          __serializer: true,
          __class: "BaseMessage",
          __ref: "1",
        },
      },
    });

    beforeEach(() => {
      vi.unstubAllEnvs();
      Serializer.deregister(BaseMessage);
    });

    it("Automatically registers serializable classes", () => {
      expect(Serializer.hasFactory("BaseMessage")).toBe(false);
      const message = BaseMessage.of({ role: "system", text: "a", meta: {} });
      const input = { message };
      const json = Serializer.serialize(input);
      const deserialized = Serializer.deserialize(json);
      expect(deserialized).toStrictEqual(input);
    });

    it("Allows to re-register same class", () => {
      expect(Serializer.hasFactory("BaseMessage")).toBe(false);
      Serializer.registerSerializable(BaseMessage);
      expect(Serializer.hasFactory("BaseMessage")).toBe(true);
      Serializer.registerSerializable(BaseMessage);
    });

    it("Throws when required class is not present", () => {
      expect(() => Serializer.deserialize(json)).toThrowError(SerializerError);
    });

    it("Parses when class is registered", () => {
      Serializer.registerSerializable(BaseMessage);
      expect(() => Serializer.deserialize(json)).not.toThrowError();
    });

    it("Parses when class is passed as external parameter.", () => {
      expect(() => Serializer.deserialize(json, [BaseMessage])).not.toThrowError();
    });

    it("Handles bounded functions", () => {
      const a = 1;
      const b = 2;

      let fn = toBoundedFunction(
        (...args: any[]) => [a, b, ...args].reduce((a, b) => a + b, 0),
        [
          {
            name: "a",
            value: a,
          },
          {
            name: "b",
            value: b,
          },
        ],
      );

      for (let i = 0; i < 5; ++i) {
        const serialized = Serializer.serialize(fn);
        fn = Serializer.deserialize(serialized);
        expect(fn(3)).toBe(6);
      }
    });

    it("Handles nested functions", () => {
      vi.stubEnv("GENAI_API_KEY", "123");
      const { data } = JSON.parse(
        `{"kind":"token","data":"{\\"__version\\":\\"0.0.35\\",\\"__root\\":{\\"__serializer\\":true,\\"__class\\":\\"Object\\",\\"__ref\\":\\"18\\",\\"__value\\":{\\"tokensUsed\\":{\\"__serializer\\":true,\\"__class\\":\\"Number\\",\\"__ref\\":\\"19\\",\\"__value\\":\\"66\\"},\\"config\\":{\\"__serializer\\":true,\\"__class\\":\\"Object\\",\\"__ref\\":\\"9\\",\\"__value\\":{\\"maxTokens\\":{\\"__serializer\\":true,\\"__class\\":\\"Number\\",\\"__ref\\":\\"10\\",\\"__value\\":\\"7000\\"},\\"llm\\":{\\"__serializer\\":true,\\"__class\\":\\"BAMChatLLM\\",\\"__ref\\":\\"3\\",\\"__value\\":{\\"llm\\":{\\"__serializer\\":true,\\"__class\\":\\"BAMLLM\\",\\"__ref\\":\\"4\\",\\"__value\\":{\\"modelId\\":\\"qwen/qwen2-72b-instruct\\",\\"parameters\\":{\\"__serializer\\":true,\\"__class\\":\\"Object\\",\\"__ref\\":\\"5\\",\\"__value\\":{}},\\"executionOptions\\":{\\"__serializer\\":true,\\"__class\\":\\"Object\\",\\"__ref\\":\\"6\\",\\"__value\\":{}}}},\\"config\\":{\\"__serializer\\":true,\\"__class\\":\\"Object\\",\\"__ref\\":\\"7\\",\\"__value\\":{\\"messagesToPrompt\\":{\\"__serializer\\":true,\\"__class\\":\\"Function\\",\\"__ref\\":\\"8\\",\\"__value\\":{\\"name\\":\\"messagesToPrompt\\",\\"fn\\":\\"messagesToPrompt(messages){return llamaTemplate.render({messages:messages.map(message=>({system:message.role===\\\\\\"system\\\\\\"?[message.text]:[],user:message.role===\\\\\\"user\\\\\\"?[message.text]:[],assistant:message.role===\\\\\\"assistant\\\\\\"?[message.text]:[]}))})}\\"}}}}}}}},\\"messages\\":{\\"__serializer\\":true,\\"__class\\":\\"Array\\",\\"__ref\\":\\"11\\",\\"__value\\":[{\\"__serializer\\":true,\\"__class\\":\\"BaseMessage\\",\\"__ref\\":\\"12\\",\\"__value\\":{\\"role\\":\\"user\\",\\"text\\":\\"My name is Tom, what is my name?\\",\\"meta\\":{\\"__serializer\\":true,\\"__class\\":\\"Undefined\\",\\"__ref\\":\\"13\\"}}},{\\"__serializer\\":true,\\"__class\\":\\"BaseMessage\\",\\"__ref\\":\\"14\\",\\"__value\\":{\\"role\\":\\"assistant\\",\\"text\\":\\"Your name is Tom.\\",\\"meta\\":{\\"__serializer\\":true,\\"__class\\":\\"Undefined\\",\\"__ref\\":\\"15\\"}}},{\\"__serializer\\":true,\\"__class\\":\\"BaseMessage\\",\\"__ref\\":\\"16\\",\\"__value\\":{\\"role\\":\\"user\\",\\"text\\":\\"My name is Tom, what is my name?\\",\\"meta\\":{\\"__serializer\\":true,\\"__class\\":\\"Undefined\\",\\"__ref\\":\\"17\\"}}},{\\"__serializer\\":true,\\"__class\\":\\"BaseMessage\\",\\"__ref\\":\\"14\\",\\"__value\\":\\"__ref\\"}]}}}}"}`,
      );
      expect(() =>
        Serializer.deserialize(data, [BAMLLM, BAMChatLLM, BaseMessage]),
      ).not.toThrowError();
    });

    it("Handles self factory references", () => {
      class A {
        static secret = 42;
      }
      class B {
        constructor(public readonly target: typeof A) {}
      }

      Serializer.register(A, {
        toPlain: () => ({}),
        fromPlain: () => new A(),
      });
      Serializer.register(B, {
        toPlain: (instance) => ({ target: instance.target }),
        fromPlain: (plain) => new B(plain.target),
      });
      expect(Serializer.deserialize(Serializer.serialize(new B(A))).target.secret).toBe(42);
    });

    it("Handles aliases", () => {
      const Name = {
        new: "MyClass",
        old: "MyOldClass",
      } as const;

      const getSerialized = (name: ValueOf<typeof Name>) =>
        `{"__version":"0.0.0","__root":{"__serializer":true,"__class":"${name}","__ref":"1","__value":{"seed":{"__serializer":true,"__class":"Number","__ref":"2","__value":"1000"}}}}`;

      class MyClass {
        constructor(public readonly seed: number) {}
      }
      expect(Serializer.hasFactory(Name.new)).toBe(false);
      expect(Serializer.hasFactory(Name.old)).toBe(false);
      Serializer.register(
        MyClass,
        {
          toPlain: (value) => ({ seed: value.seed }),
          fromPlain: (value) => new MyClass(value.seed),
        },
        [Name.old],
      );
      expect(Serializer.hasFactory(Name.new)).toBe(true);
      expect(Serializer.hasFactory(Name.old)).toBe(true);

      // Override
      Serializer.register(
        MyClass,
        {
          toPlain: (value) => ({ seed: value.seed + 100 }),
          fromPlain: (value) => new MyClass(value.seed + 100),
        },
        [],
      );

      const [a, b] = [
        Serializer.deserialize(getSerialized(Name.new)),
        Serializer.deserialize(getSerialized(Name.old)),
      ];
      verifyDeserialization(a, b);
    });
  });
});
