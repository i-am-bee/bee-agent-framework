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
  BaseToolOptions,
  CustomToolEmitter,
  StringToolOutput,
  Tool,
  ToolInput,
} from "@/tools/base.js";
import { AnyLLM, GenerateOptions } from "@/llms/base.js";
import { z } from "zod";
import { Emitter } from "@/emitter/emitter.js";

export type LLMToolInput = string;

export type LLMToolOptions<T> = {
  llm: AnyLLM<T>;
} & BaseToolOptions &
  (T extends LLMToolInput
    ? {
        transform?: (input: string) => T;
      }
    : {
        transform: (input: string) => T;
      });

export interface LLMToolRunOptions extends GenerateOptions, BaseToolOptions {}

export class LLMTool<T> extends Tool<StringToolOutput, LLMToolOptions<T>, LLMToolRunOptions> {
  name = "LLM";
  description =
    "Give a prompt to an LLM assistant. Useful to extract and re-format information, and answer intermediate questions.";

  inputSchema() {
    return z.object({ input: z.string() });
  }

  public readonly emitter: CustomToolEmitter<ToolInput<this>, StringToolOutput> =
    Emitter.root.child({
      namespace: ["tool", "llm"],
      creator: this,
    });

  static {
    this.register();
  }

  protected async _run(
    { input }: ToolInput<this>,
    options?: LLMToolRunOptions,
  ): Promise<StringToolOutput> {
    const { llm, transform } = this.options;
    const llmInput = transform ? transform(input) : (input as T);
    const response = await llm.generate(llmInput, options);
    return new StringToolOutput(response.getTextContent(), response);
  }
}
