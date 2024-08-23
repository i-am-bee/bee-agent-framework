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

import {
  BaseToolOptions,
  BaseToolRunOptions,
  JSONToolOutput,
  Tool,
  ToolError,
  ToolInput,
} from "@/tools/base.js";
import { z } from "zod";
import { createURLParams } from "@/internals/fetcher.js";
import { isNullish, pick, pickBy } from "remeda";
import { Cache } from "@/cache/decoratorCache.js";

type ToolOptions = { apiKey?: string } & BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationSearch {
  name: string;
  language?: string;
}

interface Response {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: Record<string, any[]>;
  hourly_units: Record<string, string>;
  hourly: Record<string, any[]>;
  daily_units: Record<string, string>;
  daily: Record<string, any[]>;
}

export class OpenMeteoTool extends Tool<JSONToolOutput<Response>, ToolOptions, ToolRunOptions> {
  name = "OpenMeteo";
  description = `Retrieves current, previous, or upcoming weather for a given destination.`;

  inputSchema() {
    return z
      .object({
        location: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
          })
          .strip()
          .or(
            z
              .object({
                name: z.string().min(1),
                language: z.string().default("English"),
              })
              .strip(),
          ),
        elevation: z.number().nullish(),
        timezone: z.string(),
        start_date: z
          .string()
          .date()
          .describe("Date Format: YYYY-MM-DD (omit the field for the current date)")
          .nullish(),
        end_date: z
          .string()
          .date()
          .describe("Date Format: YYYY-MM-DD (omit the field for the current date)")
          .nullish(),
        forecast_days: z.number().int().min(0).max(16).default(7),
        past_days: z.number().int().min(0).max(92).default(0),
        temperature_unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
      })
      .strip();
  }

  static {
    this.register();
  }

  protected async _run({ location, ...input }: ToolInput<this>, options?: BaseToolRunOptions) {
    const { apiKey } = this.options;

    const extractLocation = async (): Promise<Location> => {
      if ("name" in location) {
        const response = await this._geocode(
          {
            name: location.name,
            language: location.language,
          },
          options?.signal,
        );
        return pick(response, ["latitude", "longitude"]);
      }
      return location;
    };

    const params = createURLParams({
      ...pickBy(input, (v) => !isNullish(v) && v !== ""),
      ...(await extractLocation()),
      current: ["temperature_2m", "rain", "apparent_temperature"],
      daily: ["apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset"],
      hourly: ["temperature_2m", "relative_humidity_2m", "apparent_temperature"],
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      headers: {
        ...(apiKey && {
          Authorization: `Bearer ${apiKey}`,
        }),
      },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new ToolError("Request to OpenMeteo API has failed!", [
        new Error(await response.text()),
      ]);
    }

    const data: Response = await response.json();
    return new JSONToolOutput(data);
  }

  @Cache()
  protected async _geocode(location: LocationSearch, signal?: AbortSignal) {
    const { apiKey } = this.options;

    const params = createURLParams({
      name: location.name,
      language: location.language,
      format: "json",
      count: 1,
    });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
      headers: {
        ...(apiKey && {
          Authorization: `Bearer ${apiKey}`,
        }),
      },
      signal,
    });
    if (!response.ok) {
      throw new ToolError(`Failed to GeoCode provided location (${location.name}).`, [
        new Error(await response.text()),
      ]);
    }

    const { results } = await response.json();
    return results[0];
  }
}
