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

import {
  BaseLLMTokenizeOutput,
  AsyncStream,
  BaseLLMOutput,
  GenerateOptions,
  BaseLLM,
  BaseLLMEvents,
  EmbeddingOptions,
  EmbeddingOutput,
  StreamGenerateOptions,
} from "./base.js";
import { Emitter } from "@/emitter/emitter.js";
import { UnconstrainedCache } from "@/cache/unconstrainedCache.js";
import { setTimeout } from "node:timers/promises";
import { verifyDeserialization } from "@tests/e2e/utils.js";
import { NotImplementedError } from "@/errors.js";

describe("BaseLLM", () => {
  class DummyOutput extends BaseLLMOutput {
    constructor(public content: string) {
      super();
    }

    merge(other: DummyOutput) {
      this.content += other.content;
    }

    getTextContent(): string {
      return this.content;
    }

    toString(): string {
      return this.getTextContent();
    }

    createSnapshot(): unknown {
      return { content: this.content };
    }

    loadSnapshot(snapshot: unknown) {
      Object.assign(this, snapshot);
    }
  }

  class DummyLLM extends BaseLLM<string, DummyOutput> {
    public throwErrorCount = 0;

    public readonly emitter = Emitter.root.child<BaseLLMEvents>({
      namespace: ["dummy", "llm"],
      creator: this,
    });

    async meta() {
      return { tokenLimit: 4096 };
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    async embed(input: string[], options?: EmbeddingOptions): Promise<EmbeddingOutput> {
      throw new NotImplementedError();
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    tokenize(input: string): Promise<BaseLLMTokenizeOutput> {
      throw new NotImplementedError();
    }

    protected async _generate(
      input: string,
      options: Partial<GenerateOptions>,
    ): Promise<DummyOutput> {
      options?.signal?.throwIfAborted();
      await setTimeout(200);
      if (this.throwErrorCount > 0) {
        this.throwErrorCount--;
        throw new Error("Error has occurred");
      }
      return new DummyOutput(input);
    }

    protected async *_stream(
      input: string,
      options: Partial<StreamGenerateOptions>,
    ): AsyncStream<DummyOutput, void> {
      for (const chunk of input.split(",")) {
        if (options?.signal?.aborted) {
          break;
        }
        await setTimeout(100);
        yield new DummyOutput(chunk);
      }
    }

    createSnapshot() {
      return { ...super.createSnapshot(), throwErrorCount: this.throwErrorCount };
    }
  }

  it("Stops generating", async () => {
    const model = new DummyLLM("my-model");

    const chunks: string[] = [];
    await model
      .generate("1,2,3,4,5", {
        stream: true,
      })
      .observe((emitter) =>
        emitter.registerCallbacks({
          newToken: ({ value, callbacks: { abort } }) => {
            chunks.push(value.getTextContent());
            if (value.getTextContent() === "3") {
              abort();
            }
          },
        }),
      );
    expect(chunks.join(",")).toBe("1,2,3");
  });

  describe("Caching", () => {
    let model: DummyLLM;
    beforeEach(() => {
      model = new DummyLLM("my-model", {}, new UnconstrainedCache());
    });

    const generate = async (input: unknown[], options?: GenerateOptions) => {
      const chunks: string[] = [];
      const events: string[] = [];

      await model.generate(input.join(","), options).observe((emitter) => {
        emitter.registerCallbacks({
          newToken: ({ value }) => {
            chunks.push(value.getTextContent());
          },
        });
        emitter.match("*.*", (_, event) => {
          events.push(event.path);
        });
      });

      return { chunks, events };
    };

    it("Handles streaming", async () => {
      const [a, b] = await Promise.all([
        generate([1, 2, 3], {
          stream: true,
        }),
        generate([1, 2, 3], {
          stream: true,
        }),
      ]);
      expect(a).toEqual(b);
      await expect(model.cache.size()).resolves.toBe(1);
    });

    it("Handles non-streaming", async () => {
      const [c, d] = await Promise.all([
        generate([1, 2, 3], {
          stream: false,
        }),
        generate([1, 2, 3], {
          stream: false,
        }),
      ]);
      expect(c).toEqual(d);
      await expect(model.cache.size()).resolves.toBe(1);
    });

    it("Correctly generates cache keys", async () => {
      await expect(model.cache.size()).resolves.toBe(0);

      await generate(["a"]);
      await expect(model.cache.size()).resolves.toBe(1);

      await generate(["a"], {});
      await expect(model.cache.size()).resolves.toBe(1);
      await generate(["a"], { signal: AbortSignal.timeout(1000) });
      await expect(model.cache.size()).resolves.toBe(1);

      await generate(["a"], { stream: false });
      await expect(model.cache.size()).resolves.toBe(2);

      await generate(["a"], { stream: true });
      await expect(model.cache.size()).resolves.toBe(3);
      await generate(["a"], { signal: AbortSignal.timeout(1500), stream: true });
      await expect(model.cache.size()).resolves.toBe(3);

      await generate(["a"], { guided: { regex: /.+/.source } });
      await expect(model.cache.size()).resolves.toBe(4);
      await generate(["a"], { guided: { regex: /.+/.source } });
      await expect(model.cache.size()).resolves.toBe(4);
    });

    it("Clears cache", async () => {
      await generate(["a"]);
      await expect(model.cache.size()).resolves.toBe(1);
      await model.cache.clear();
      await expect(model.cache.size()).resolves.toBe(0);
    });

    it("Ignores rejected values", async () => {
      vi.useRealTimers();

      model.throwErrorCount = 1;
      for (const promise of await Promise.allSettled([
        setTimeout(0, model.generate("Test")),
        setTimeout(0, model.generate("Test")),
        setTimeout(0, model.generate("Test")),
      ])) {
        expect(promise).property("status").to.eq("rejected");
      }
      await expect(model.cache.size()).resolves.toBe(0);

      await expect(model.generate("Test")).resolves.toBeTruthy();
      await expect(model.cache.size()).resolves.toBe(1);
    });

    it("Serializes with non-empty cache", async () => {
      await expect(model.generate("Test")).resolves.toBeTruthy();
      await expect(model.cache.size()).resolves.toBe(1);

      const serialized = model.serialize();
      const deserialized = DummyLLM.fromSerialized(serialized);
      verifyDeserialization(model, deserialized);

      await expect(deserialized.cache.size()).resolves.toBe(1);
      await expect(deserialized.generate("Test")).resolves.toBeTruthy();
      await expect(deserialized.cache.size()).resolves.toBe(1);
    });
  });

  it("Serializes", () => {
    const model = new DummyLLM("my-model");
    const serialized = model.serialize();
    const deserialized = DummyLLM.fromSerialized(serialized);
    verifyDeserialization(model, deserialized);
  });
});
