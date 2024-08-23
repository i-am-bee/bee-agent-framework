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
  StreamGenerateOptions,
  AsyncStream,
  BaseLLMOutput,
  GenerateOptions,
  BaseLLM,
  GenerateCallbacks,
} from "./base.js";
import { Emitter } from "@/emitter/emitter.js";

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
    public readonly emitter = Emitter.root.child<GenerateCallbacks>({
      namespace: ["dummy", "llm"],
      creator: this,
    });

    async meta() {
      return { tokenLimit: 4096 };
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    tokenize(input: string): Promise<BaseLLMTokenizeOutput> {
      throw new Error("Method not implemented.");
    }

    // eslint-disable-next-line unused-imports/no-unused-vars
    protected _generate(input: string, options?: GenerateOptions): Promise<any> {
      throw new Error("Method not implemented.");
    }
    protected async *_stream(
      input: string,
      options?: StreamGenerateOptions,
    ): AsyncStream<DummyOutput, void> {
      for (const chunk of input.split(",")) {
        options?.signal?.throwIfAborted();
        await new Promise((resolve) => setTimeout(resolve, 100));
        yield new DummyOutput(chunk);
      }
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
});
