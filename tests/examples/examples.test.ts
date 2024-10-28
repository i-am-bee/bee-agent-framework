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

import { expect } from "vitest";
import { exec } from "child_process";
import { glob } from "glob";
import { isTruthy } from "remeda";
import { hasEnv } from "@/internals/env.js";
import { ExecException } from "node:child_process";

const execAsync = (command: string) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) =>
    exec(
      command,
      {
        shell: process.env.SHELL || "/bin/bash",
      },
      (error, stdout, stderr) => (error ? reject(error) : resolve({ stdout, stderr })),
    ),
  );

const includePattern = process.env.INCLUDE_PATTERN || `./examples/**/*.ts`;
const excludePattern = process.env.EXCLUDE_PATTERN || ``;

const exclude: string[] = [
  "examples/playground/**/*.ts",
  !hasEnv("WATSONX_API_KEY") && [
    "examples/llms/text.ts",
    "examples/llms/providers/watsonx_verbose.ts",
    "examples/llms/providers/watsonx.ts",
  ],
  !hasEnv("GROQ_API_KEY") && ["examples/agents/sql.ts", "examples/llms/providers/groq.ts"],
  !hasEnv("OPENAI_API_KEY") && [
    "examples/agents/bee_reusable.ts",
    "examples/llms/providers/openai.ts",
  ],
  !hasEnv("IBM_VLLM_URL") && ["examples/llms/providers/ibm-vllm.ts"],
  !hasEnv("COHERE_API_KEY") && ["examples/llms/providers/langchain.ts"],
  !hasEnv("CODE_INTERPRETER_URL") && ["examples/tools/custom/python.ts"],
  ["examples/llms/providers/bam.ts", "examples/llms/providers/bam_verbose.ts"],
]
  .filter(isTruthy)
  .flat(); // list of examples that are excluded

describe("E2E Examples", async () => {
  const exampleFiles = await glob(includePattern, {
    cwd: process.cwd(),
    dot: false,
    realpath: true,
    ignore: [exclude, excludePattern].flat(),
  });

  it.concurrent.each(exampleFiles)(`Run %s`, async (example) => {
    await execAsync(`yarn start -- ${example} <<< "Hello world"`)
      .then(({ stdout, stderr }) => {
        // eslint-disable-next-line no-console
        console.log("STDOUT:", stdout);
        expect(stderr).toBeFalsy();
      })
      .catch((_e) => {
        const error = _e as ExecException;

        // eslint-disable-next-line no-console
        console.error(error.message);
        // eslint-disable-next-line no-console
        console.error("STDOUT:", error.stdout);

        expect(error.stderr).toBeFalsy();
        expect(error.code).toBe(0);
      });
  });
});
