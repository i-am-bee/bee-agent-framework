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

import { BaseToolOptions, BaseToolRunOptions, Tool, ToolInput } from "@/tools/base.js";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { PromiseClient, createPromiseClient } from "@connectrpc/connect";
import { CodeInterpreterService } from "bee-proto/code_interpreter/v1/code_interpreter_service_connect";
import { z } from "zod";
import { BaseLLMOutput } from "@/llms/base.js";
import { LLM } from "@/llms/index.js";
import { PromptTemplate } from "@/template.js";
import { mapToObj } from "remeda";
import { PythonFile, PythonStorage } from "@/tools/python/storage.js";
import { PythonToolOutput } from "@/tools/python/output.js";
import { ValidationError } from "ajv";
import { ConnectionOptions } from "node:tls";

export interface PythonToolOptions extends BaseToolOptions {
  codeInterpreter: {
    url: string;
    connectionOptions?: ConnectionOptions;
  };
  executorId?: string;
  preprocess?: { llm: LLM<BaseLLMOutput>; promptTemplate: PromptTemplate<"input"> };
  storage: PythonStorage;
}

export class PythonTool extends Tool<PythonToolOutput, PythonToolOptions> {
  name = "Python";
  description = [
    "Run Python code and return the console output. Use for tasks that involve calculations, computations, or data manipulation.",
    "If files are created inside Python code, the user won't see them right away -- tool output will provide hashes of the created files, and the assistant must reference them using a Markdown link or image, by using the provided URN. ",
    "To work with some files, you must specify them in the input schema; otherwise, the file will not be accessible.",
    "It is necessary to always print() results. Available libraries include numpy, pandas, scipy, matplotlib (but you have to save the plot as a file, showing does not work), but you can import any library and it will be installed for you.",
    "The execution state is not preserved -- each invocation is a new environment. Do not use this tool multiple times in a row, always write the full code you want to run in a single invocation.",
  ].join("");

  public readonly storage: PythonStorage;

  async inputSchema() {
    const files = await this.storage.list();

    return z.object({
      code: z.string().min(1).describe("full source code file in Python that will be executed"),
      inputFiles: z
        .object(
          mapToObj(files, (value) => [
            value.hash,
            z.literal(value.filename).describe("filename of a file"),
          ]),
        )
        .partial()
        .optional()
        .describe(
          [
            "To access an existing file, you must specify it; otherwise, the file will not be accessible. IMPORTANT: If the file is not provided in the input, it will not be accessible.",
            "The key is the final segment of a file URN, and the value is the filename. ",
            files.length > 0
              ? `Example: {"${files[0].hash}":"${files[0].filename}"} -- the files will be available to the Python code in the working directory.`
              : `Example: {"e6979b7bec732b89a736fd19436ec295f6f64092c0c6c0c86a2a7f27c73519d6":"file.txt"} -- the files will be available to the Python code in the working directory.`,
          ].join(""),
        ),
    });
  }

  protected readonly client: PromiseClient<typeof CodeInterpreterService>;
  protected readonly preprocess;

  public constructor(options: PythonToolOptions) {
    super(options);
    if (!options.codeInterpreter.url) {
      throw new ValidationError([
        {
          message: "Property must be a valid URL!",
          data: options,
          propertyName: "codeInterpreter.url",
        },
      ]);
    }
    this.client = this._createClient();
    this.preprocess = options.preprocess;
    this.storage = options.storage;
  }

  static {
    this.register();
  }

  protected _createClient(): PromiseClient<typeof CodeInterpreterService> {
    return createPromiseClient(
      CodeInterpreterService,
      createGrpcTransport({
        baseUrl: this.options.codeInterpreter.url,
        httpVersion: "2",
        nodeOptions: this.options.codeInterpreter.connectionOptions,
      }),
    );
  }

  protected async _run(input: ToolInput<this>, options?: BaseToolRunOptions) {
    const inputFiles: PythonFile[] = Object.entries(input.inputFiles ?? {})
      .filter(([k, v]) => k && v)
      .map(([hash, filename]) => ({
        hash,
        filename: filename!,
      }));

    await this.storage.upload(inputFiles);

    // replace relative paths in "files" with absolute paths by prepending "/workspace"
    const filesInput = Object.fromEntries(
      inputFiles
        .filter((file) => file.filename)
        .map((file) => [`/workspace/${file.filename}`, file.hash]),
    );

    const getSourceCode = async () => {
      if (this.preprocess) {
        const { llm, promptTemplate } = this.preprocess;
        const response = await llm.generate(promptTemplate.render({ input: input.code }), {
          signal: options?.signal,
          stream: false,
        });
        return response.getTextContent().trim();
      }
      return input.code;
    };

    const result = await this.client.execute(
      {
        sourceCode: await getSourceCode(),
        executorId: this.options.executorId ?? "default",
        files: filesInput,
      },
      { signal: options?.signal },
    );

    // replace absolute paths in "files" with relative paths by removing "/workspace/"
    // skip files that are not in "/workspace"
    // skip entries that are also entries in filesInput
    const prefix = "/workspace/";
    const filesOutput: PythonFile[] = Object.entries(result.files)
      .map(([k, v]): PythonFile => ({ filename: k, hash: v }))
      .filter(
        (file) =>
          file.filename.startsWith(prefix) &&
          !(
            file.filename.slice(prefix.length) in filesInput &&
            filesInput[file.filename.slice(prefix.length)] === file.hash
          ),
      )
      .map((file) => ({
        hash: file.hash,
        filename: file.filename.slice(prefix.length),
      }));

    await this.storage.download(filesOutput);
    return new PythonToolOutput(result.stdout, result.stderr, result.exitCode, filesOutput);
  }

  createSnapshot() {
    return {
      ...super.createSnapshot(),
      storage: this.storage,
      preprocess: this.preprocess,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>): void {
    super.loadSnapshot(snapshot);
    Object.assign(this, { client: this._createClient() });
  }
}
