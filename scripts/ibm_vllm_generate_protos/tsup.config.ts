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

import { defineConfig } from "tsup";
import fs from "node:fs";

if (!process.env.ENTRY) {
  throw new Error(`Entry file was not provided!`);
}
const target = `types/${process.env.ENTRY}.ts`;
await fs.promises.writeFile(
  target,
  [
    `export { ProtoGrpcType as A } from "./caikit_runtime_Nlp.js"`,
    `export { ProtoGrpcType as B } from "./generation.js"`,
  ].join("\n"),
);

export default defineConfig({
  entry: [target],
  tsconfig: "./tsconfig.proto.json",
  sourcemap: false,
  dts: true,
  format: ["esm"],
  treeshake: true,
  legacyOutput: false,
  skipNodeModulesBundle: true,
  bundle: true,
  splitting: false,
  silent: false,
  clean: true,
});
