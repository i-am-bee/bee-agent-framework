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

import { BaseLLM, BaseLLMOutput, BaseLLMEvents, GenerateOptions } from "./base.js";
import { Emitter } from "@/emitter/emitter.js";

export type LLMInput = string;

export type LLMEvents<TOutput extends BaseLLMOutput = BaseLLMOutput> = BaseLLMEvents<
  LLMInput,
  TOutput
>;

export abstract class LLM<
  TOutput extends BaseLLMOutput,
  TGenerateOptions extends GenerateOptions = GenerateOptions,
> extends BaseLLM<LLMInput, TOutput, TGenerateOptions> {
  public abstract readonly emitter: Emitter<LLMEvents<TOutput>>;
}
