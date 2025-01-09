/**
 * Copyright 2025 IBM Corp.
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
  ToolEmitter,
  StringToolOutput,
  Tool,
  ToolInput,
} from "@/tools/base.js";
import { FrameworkError } from "@/errors.js";
import { z } from "zod";
import { validate } from "@/internals/helpers/general.js";
import { CodeInterpreterOptions } from "./python/python.js";
import { RunContext } from "@/context.js";
import { Emitter } from "@/emitter/emitter.js";

export class CustomToolCreateError extends FrameworkError {}
export class CustomToolExecuteError extends FrameworkError {}

const toolOptionsSchema = z
  .object({
    codeInterpreter: z.object({
      url: z.string().url(),
      connectionOptions: z.any().optional(),
    }),
    sourceCode: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    inputSchema: z.any(),
  })
  .passthrough();

export type CustomToolOptions = z.output<typeof toolOptionsSchema> & BaseToolOptions;

export class CustomTool extends Tool<StringToolOutput, CustomToolOptions> {
  name: string;
  description: string;

  public readonly emitter: ToolEmitter<ToolInput<this>, StringToolOutput> = Emitter.root.child({
    namespace: ["tool", "custom"],
    creator: this,
  });

  public inputSchema() {
    return this.options.inputSchema;
  }

  static {
    this.register();
  }

  public constructor(options: CustomToolOptions) {
    validate(options, toolOptionsSchema);
    super(options);
    this.name = options.name;
    this.description = options.description;
  }

  protected async _run(
    input: any,
    _options: Partial<BaseToolRunOptions>,
    run: RunContext<typeof this>,
  ) {
    const response = await fetch(`${this.options.codeInterpreter.url}/v1/execute-custom-tool`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool_source_code: this.options.sourceCode,
        tool_input_json: JSON.stringify(input),
      }),
      signal: run.signal,
    }).catch((error) => {
      if (error.cause.name == "HTTPParserError") {
        throw new CustomToolExecuteError(
          "Request to bee-code-interpreter has failed -- ensure that CODE_INTERPRETER_URL points to the new HTTP endpoint (default port: 50081).",
          [error],
        );
      } else {
        throw new CustomToolExecuteError("Request to bee-code-interpreter has failed.", [error]);
      }
    });

    if (!response?.ok) {
      throw new CustomToolExecuteError(
        `Request to bee-code-interpreter has failed with HTTP status code ${response.status}.`,
        [new Error(await response.text())],
      );
    }

    const result = await response.json();

    if (result?.exit_code) {
      throw new CustomToolExecuteError(`Custom tool ${result.tool_name} execution error!`);
    }

    return new StringToolOutput(result.tool_output_json);
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
  }

  static async fromSourceCode(codeInterpreter: CodeInterpreterOptions, sourceCode: string) {
    const response = await fetch(`${codeInterpreter.url}/v1/parse-custom-tool`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool_source_code: sourceCode,
      }),
    }).catch((error) => {
      if (error.cause.name == "HTTPParserError") {
        throw new CustomToolCreateError(
          "Request to bee-code-interpreter has failed -- ensure that CODE_INTERPRETER_URL points to the new HTTP endpoint (default port: 50081).",
          [error],
        );
      } else {
        throw new CustomToolCreateError("Request to bee-code-interpreter has failed.", [error]);
      }
    });

    if (!response?.ok) {
      throw new CustomToolCreateError(
        `Request to bee-code-interpreter has failed with HTTP status code ${response.status}.`,
        [new Error(await response.text())],
      );
    }

    const result = await response.json();

    return new CustomTool({
      codeInterpreter,
      sourceCode,
      name: result.tool_name,
      description: result.tool_description,
      inputSchema: JSON.parse(result.tool_input_schema_json),
    });
  }
}
