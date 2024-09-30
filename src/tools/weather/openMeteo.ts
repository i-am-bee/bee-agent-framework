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
import { RunContext } from "@/context.js";

type ToolOptions = { apiKey?: string } & BaseToolOptions;
type ToolRunOptions = BaseToolRunOptions;

interface Location {
  latitude: number;
  longitude: number;
}

interface LocationSearch {
  name: string;
  country?: string;
  language?: string;
}

export interface OpenMeteoToolResponse {
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

export class OpenMeteoTool extends Tool<
  JSONToolOutput<OpenMeteoToolResponse>,
  ToolOptions,
  ToolRunOptions
> {
  name = "OpenMeteo";
  description = `Retrieves current, past, or future weather forecasts for a specified location.`;

  inputSchema() {
    return z
      .object({
        location: z.union([
          z
            .object({
              name: z.string().min(1),
              country: z.string().optional(),
              language: z.string().default("English"),
            })
            .strip(),
          z
            .object({
              latitude: z.number(),
              longitude: z.number(),
            })
            .strip(),
        ]),
        start_date: z
          .union([z.string().date(), z.string().datetime()])
          .describe("Start date for the weather forecast in the format YYYY-MM-DD (UTC)"),
        end_date: z
          .union([z.string().date(), z.string().datetime()])
          .describe("End date for the weather forecast in the format YYYY-MM-DD (UTC)")
          .optional(),
        elevation: z.number().nullish(),
        temperature_unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
      })
      .strip();
  }

  static {
    this.register();
  }

  protected async _run(
    { location, start_date: startDate, end_date: endDate, ...input }: ToolInput<this>,
    _options: BaseToolRunOptions | undefined,
    run: RunContext<this>,
  ) {
    const { apiKey } = this.options;

    const prepareParams = async () => {
      const extractLocation = async (): Promise<Location> => {
        if ("name" in location) {
          const response = await this._geocode(location, run.signal);
          return pick(response, ["latitude", "longitude"]);
        }
        return location;
      };

      const start = startDate ? new Date(startDate) : new Date();
      start.setHours(0, 0, 0, 0);
      start.setTime(start.getTime() - start.getTimezoneOffset() * 60_000);

      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(0, 0, 0, 0);
      end.setTime(end.getTime() - end.getTimezoneOffset() * 60_000);

      const toDateString = (date: Date) => date.toISOString().split("T")[0];

      return createURLParams({
        ...pickBy(input, (v) => !isNullish(v) && v !== ""),
        ...(await extractLocation()),
        start_date: toDateString(start),
        end_date: toDateString(end),
        current: ["temperature_2m", "rain", "apparent_temperature"],
        daily: ["apparent_temperature_max", "apparent_temperature_min", "sunrise", "sunset"],
        hourly: ["temperature_2m", "relative_humidity_2m", "apparent_temperature"],
        timezone: "UTC",
      });
    };

    const params = await prepareParams();
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      headers: {
        ...(apiKey && {
          Authorization: `Bearer ${apiKey}`,
        }),
      },
      signal: run.signal,
    });

    if (!response.ok) {
      throw new ToolError("Request to OpenMeteo API has failed!", [
        new Error(await response.text()),
      ]);
    }

    const data: OpenMeteoToolResponse = await response.json();
    return new JSONToolOutput(data);
  }

  @Cache()
  protected async _geocode(location: LocationSearch, signal: AbortSignal) {
    const { apiKey } = this.options;

    const params = createURLParams({
      name: location.name,
      language: location.language,
      country: location.country,
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
    if (!results || results.length === 0) {
      throw new ToolError(`Location '${location.name}' was not found.`);
    }
    return results[0];
  }
}
