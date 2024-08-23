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
import { splitString } from "./string.js";

describe("String Utilities", () => {
  it("splitString", () => {
    const text =
      "00 01 02 03 04 05 06 07 08 09 " +
      "10 11 12 13 14 15 16 17 18 19 " +
      "20 21 22 23 24 25 26 27 28 29 " +
      "30 31 32 33 34 35 36 37 38 39 ";
    const chunks = [...splitString(text, { size: 30, overlap: 15 })];
    expect(chunks).toEqual([
      "00 01 02 03 04 05 06 07 08 09 ",
      "05 06 07 08 09 10 11 12 13 14 ",
      "10 11 12 13 14 15 16 17 18 19 ",
      "15 16 17 18 19 20 21 22 23 24 ",
      "20 21 22 23 24 25 26 27 28 29 ",
      "25 26 27 28 29 30 31 32 33 34 ",
      "30 31 32 33 34 35 36 37 38 39 ",
      "35 36 37 38 39 ",
    ]);
  });
});
