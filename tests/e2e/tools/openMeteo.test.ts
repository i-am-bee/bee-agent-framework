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

import { beforeEach, expect } from "vitest";
import { OpenMeteoTool } from "@/tools/weather/openMeteo.js";
import { ToolInputValidationError } from "@/tools/base.js";

describe("OpenMeteo", () => {
  let instance: OpenMeteoTool;

  beforeEach(() => {
    instance = new OpenMeteoTool();
  });

  it("Runs", async () => {
    const response = await instance.run(
      {
        location: {
          name: "Boston",
        },
        start_date: "2023-09-10",
        temperature_unit: "celsius",
      },
      {
        signal: AbortSignal.timeout(60 * 1000),
        retryOptions: {},
      },
    );

    expect(response.isEmpty()).toBe(false);
    expect(response.result).toMatchObject({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      generationtime_ms: expect.any(Number),
      utc_offset_seconds: 0,
      timezone: "UTC",
      timezone_abbreviation: "UTC",
    });
  });

  it("Throws", async () => {
    await expect(
      instance.run({
        location: { name: "Prague" },
        start_date: "123",
      }),
    ).rejects.toThrowError(ToolInputValidationError);
  });
});
