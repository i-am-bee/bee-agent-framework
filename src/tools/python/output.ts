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

import { ToolOutput } from "@/tools/base.js";
import { PythonFile } from "@/tools/python/storage.js";

export class PythonToolOutput extends ToolOutput {
  constructor(
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode?: number,
    public readonly outputFiles: PythonFile[] = [],
  ) {
    super();
  }

  static {
    this.register();
  }

  isEmpty() {
    return false;
  }

  getTextContent() {
    const fileList = this.outputFiles
      .map((file) => `- [${file.filename}](urn:${file.id})`)
      .join("\n");
    return `The code exited with code ${this.exitCode}.
stdout:
\`\`\`
${this.stdout}
\`\`\`

stderr:
\`\`\`
${this.stderr}
\`\`\`

${fileList ? "Files that were created or modified:\n" + fileList : "No files were created or modified."}`;
  }

  createSnapshot() {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
      exitCode: this.exitCode,
      outputFiles: this.outputFiles,
    };
  }

  loadSnapshot(snapshot: ReturnType<typeof this.createSnapshot>) {
    Object.assign(this, snapshot);
  }
}
