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
    executorId: z.string().nullable().optional(),
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
    // Execute custom tool
    const httpUrl = this.options.codeInterpreter.url + "/v1/execute-custom-tool";
    const response = await this.customFetch(httpUrl, input, run);

    if (!response?.ok) {
      throw new CustomToolExecuteError("HTTP request failed!", [new Error(await response.text())]);
    }

    const result = await response.json();

    if (result?.exit_code) {
      throw new CustomToolExecuteError(`Custom tool {tool_name} execution error!`);
    }

    return new StringToolOutput(result.tool_output_json);
  }

  private async customFetch(httpUrl: string, input: any, run: RunContext<typeof this>) {
    try {
      return await fetch(httpUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_source_code: this.options.sourceCode,
          executorId: this.options.executorId ?? "default",
          tool_input_json: JSON.stringify(input),
        }),
        signal: run.signal,
      });
    } catch (error) {
      if (error.cause.name == "HTTPParserError") {
        throw new CustomToolExecuteError(
          "Custom tool over HTTP failed -- not using HTTP endpoint!",
          [error],
        );
      } else {
        throw new CustomToolExecuteError("Custom tool over HTTP failed!", [error]);
      }
    }
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
  }

  static async fromSourceCode(
    codeInterpreter: CodeInterpreterOptions,
    sourceCode: string,
    executorId?: string,
  ) {
    // Parse custom tool
    let response;
    const httpUrl = codeInterpreter.url + "/v1/parse-custom-tool";
    try {
      response = await fetch(httpUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tool_source_code: sourceCode,
          executorId: executorId ?? "default",
        }),
      });
    } catch (error) {
      if (error.cause.name == "HTTPParserError") {
        throw new CustomToolCreateError("Custom tool parse error -- not using HTTP endpoint!", [
          error,
        ]);
      } else {
        throw new CustomToolCreateError("Custom tool parse error!", [error]);
      }
    }

    if (!response?.ok) {
      throw new CustomToolCreateError("Error parsing custom tool!", [
        new Error(await response.text()),
      ]);
    }

    const result = await response.json();

    const { tool_name, tool_description, tool_input_schema_json } = result;

    return new CustomTool({
      codeInterpreter,
      sourceCode,
      name: tool_name,
      description: tool_description,
      inputSchema: JSON.parse(tool_input_schema_json),
      executorId,
    });
  }
}
