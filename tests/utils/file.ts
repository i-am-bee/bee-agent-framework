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

import * as os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { createRandomHash } from "@/internals/helpers/hash.js";

export async function getTempFile(name: string, data: string) {
  const fullPath = path.join(os.tmpdir(), `${createRandomHash(4)}_${name}`);
  await fs.promises.writeFile(fullPath, data);

  return {
    fullPath,
    async [Symbol.asyncDispose]() {
      await fs.promises.unlink(fullPath);
    },
  };
}
