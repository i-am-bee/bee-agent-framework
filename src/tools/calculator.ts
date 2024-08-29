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
    BaseToolRunOptions,
    StringToolOutput,
    Tool,
    ToolInput,
  } from "@/tools/base.js";
  import { z } from "zod";
  import { evaluate } from 'mathjs'
  
  export class CalculatorTool extends Tool<StringToolOutput, BaseToolOptions> {
    name = "Calculator";
    description = `A calculator tool that performs basic arithmetic operations like addition, subtraction, multiplication, and division. 
Only use the calculator tool if you need to perform a calculation.`;
    inputSchema() {
      return z.object({
        expression: z.string().describe(`The mathematical expression to evaluate (e.g., "2 + 3 * 4"). Use Math.js basic expression syntax. Constants only.`),
      });
    }
  
    constructor({...options }: BaseToolOptions = {}) {
      super(options);
    }
  
    protected async _run({ expression }: ToolInput<this>, options?: BaseToolRunOptions) {
      const result = evaluate(expression)
      return new StringToolOutput(result);
    }
  }