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

import { BaseToolOptions, BaseToolRunOptions, ToolEmitter, Tool, ToolInput } from "@/tools/base.js";
import { createGrpcTransport } from "@connectrpc/connect-node";
import { PromiseClient, createPromiseClient } from "@connectrpc/connect";
import { CodeInterpreterService } from "bee-proto/code_interpreter/v1/code_interpreter_service_connect";
import { z } from "zod";
import { BaseLLMOutput } from "@/llms/base.js";
import { LLM } from "@/llms/llm.js";
import { PromptTemplate } from "@/template.js";
import { filter, isIncludedIn, isTruthy, map, pipe, unique, uniqueBy } from "remeda";
import { PythonFile, PythonStorage } from "@/tools/python/storage.js";
import { PythonToolOutput } from "@/tools/python/output.js";
import { ValidationError } from "ajv";
import { ConnectionOptions } from "node:tls";
import { RunContext } from "@/context.js";
import { hasMinLength } from "@/internals/helpers/array.js";
import { Emitter } from "@/emitter/emitter.js";

export interface CodeInterpreterOptions {
  url: string;
  connectionOptions?: ConnectionOptions;
}

export interface PythonToolOptions extends BaseToolOptions {
  codeInterpreter: CodeInterpreterOptions;
  executorId?: string;
  preprocess?: {
    llm: LLM<BaseLLMOutput>;
    promptTemplate: PromptTemplate.infer<{ input: string }>;
  };
  storage: PythonStorage;
}

export class PythonTool extends Tool<PythonToolOutput, PythonToolOptions> {
  name = "Python";
  description = [
    "Run Python and/or shell code and return the console output. Use for isolated calculations, computations, data or file manipulation but still prefer assistant's capabilities (IMPORTANT: Do not use for text analysis or summarization).",
    "Files provided by the user, or created in a previous run, will be accessible if and only if they are specified in the input. It is necessary to always print() results.",
    "The following shell commands are available:",
    "Use ffmpeg to convert videos.",
    "Use yt-dlp to download videos, and unless specified otherwise use `-S vcodec:h264,res,acodec:m4a` for video and `-x --audio-format mp3` for audio-only.",
    "Use pandoc to convert documents between formats (like MD, DOC, DOCX, PDF) -- and don't forget that you can create PDFs by writing markdown and then converting.",
    "In Python, the following modules are available:",
    "Use numpy, pandas, scipy and sympy for working with data.",
    "Use matplotlib to plot charts.",
    "Use pillow (import PIL) to create and manipulate images.",
    "Use moviepy for complex manipulations with videos.",
    "Use PyPDF2, pikepdf, or fitz to manipulate PDFs.",
    "Use pdf2image to convert PDF to images.",
    "Other Python libraries are also available -- however, prefer using the ones above.",
    "Prefer using qualified imports -- `import library; library.thing()` instead of `import thing from library`.",
    "Do not attempt to install libraries manually -- it will not work.",
    "Each invocation of Python runs in a completely fresh VM -- it will not remember anything from before.",
    "Do not use this tool multiple times in a row, always write the full code you want to run in a single invocation.",
  ].join(" ");

  public readonly storage: PythonStorage;
  protected files: PythonFile[] = [];

  public readonly emitter: ToolEmitter<ToolInput<this>, PythonToolOutput> = Emitter.root.child({
    namespace: ["tool", "python"],
    creator: this,
  });

  async inputSchema() {
    this.files = await this.storage.list();
    const fileNames = unique(map(this.files, ({ filename }) => filename));
    return z.object({
      language: z.enum(["python", "shell"]).describe("Use shell for ffmpeg, pandoc, yt-dlp"),
      code: z.string().describe("full source code file that will be executed"),
      ...(hasMinLength(fileNames, 1)
        ? {
            inputFiles: z
              .array(z.enum(fileNames))
              .describe(
                "To access an existing file, you must specify it; otherwise, the file will not be accessible. IMPORTANT: If the file is not provided in the input, it will not be accessible.",
              ),
          }
        : {}),
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

  protected async _run(
    input: ToolInput<this>,
    _options: Partial<BaseToolRunOptions>,
    run: RunContext<this>,
  ) {
    const inputFiles = await pipe(
      this.files ?? (await this.storage.list()),
      uniqueBy((f) => f.filename),
      filter((file) => isIncludedIn(file.filename, (input.inputFiles ?? []) as string[])),
      (files) => this.storage.upload(files),
    );

    // replace relative paths in "files" with absolute paths by prepending "/workspace"
    const getSourceCode = async () => {
      if (this.preprocess) {
        const { llm, promptTemplate } = this.preprocess;
        const response = await llm.generate(promptTemplate.render({ input: input.code }), {
          signal: run.signal,
          stream: false,
        });
        return response.getTextContent().trim();
      }
      return input.code;
    };

    const prefix = "/workspace/";

    const result = await this.client.execute(
      {
        sourceCode: await getSourceCode(),
        executorId: this.options.executorId ?? "default",
        files: Object.fromEntries(
          inputFiles.map((file) => [`${prefix}${file.filename}`, file.pythonId]),
        ),
      },
      { signal: run.signal },
    );

    // replace absolute paths in "files" with relative paths by removing "/workspace/"
    // skip files that are not in "/workspace"
    // skip entries that are also entries in filesInput
    const filesOutput = await this.storage.download(
      Object.entries(result.files)
        .map(([k, v]) => {
          const file = { path: k, pythonId: v };
          if (!file.path.startsWith(prefix)) {
            return;
          }

          const filename = file.path.slice(prefix.length);
          if (
            inputFiles.some(
              (input) => input.filename === filename && input.pythonId === file.pythonId,
            )
          ) {
            return;
          }

          return {
            pythonId: file.pythonId,
            filename,
          };
        })
        .filter(isTruthy),
    );
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
