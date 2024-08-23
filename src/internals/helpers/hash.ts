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

import { createHash as _createHash, randomBytes } from "node:crypto";

export function createHash(input: string, length = 4) {
  return _createHash("shake256", {
    outputLength: length,
  })
    .update(input)
    .digest("hex");
}

export function createRandomHash(length = 4) {
  return createHash(randomBytes(20).toString("base64"), length);
}
