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

import { NonUndefined } from "@/internals/types.js";
import { LinePrefixParser } from "@/agents/parsers/linePrefix.js";
import { JSONParserField, ZodParserField } from "@/agents/parsers/field.js";

export type BeeParserInput = LinePrefixParser.define<{
  thought: ZodParserField<string>;
  tool_name: ZodParserField<string>;
  tool_input: JSONParserField<Record<string, any>>;
  tool_output: ZodParserField<string>;
  final_answer: ZodParserField<string>;
  human_tool_input: ZodParserField<string>; // Added field for HumanTool input
  human_tool_output: ZodParserField<string>; // Added field for HumanTool output
}>;

type BeeParser = LinePrefixParser<BeeParserInput>;
export type BeeIterationResult = LinePrefixParser.inferOutput<BeeParser>;
export type BeeIterationResultPartial = LinePrefixParser.inferPartialOutput<BeeParser>;
export type BeeIterationToolResult = NonUndefined<BeeIterationResult, "tool_input" | "tool_name">;