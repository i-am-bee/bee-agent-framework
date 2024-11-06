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
import { isNullish, omit, pick, pickBy } from "remeda";
import { Cache } from "@/cache/decoratorCache.js";
import { RunContext } from "@/context.js";
import { getProp, setProp } from "@/internals/helpers/object.js";

type ToolOptions = {
  apiKey?: string;
  hourly?: boolean;
  daily?: boolean;
} & BaseToolOptions;
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

const omittedKeys: string[] = [
  "latitude",
  "longitude",
  "generationtime_ms",
  "utc_offset_seconds",
  "timezone_abbreviation",
  "elevation",
];

export interface OpenMeteoToolResponse {
  timezone: string;
  current_units: Record<string, string>;
  current: Record<string, any[]>;
  hourly_units?: Record<string, string>;
  hourly?: Record<string, any[]>;
  daily_units?: Record<string, string>;
  daily?: Record<string, any[]>;
}

export class OpenMeteoTool extends Tool<
  JSONToolOutput<OpenMeteoToolResponse>,
  ToolOptions,
  ToolRunOptions
> {
  name = "OpenMeteo";
  description = `Retrieve current, past, or future weather forecasts for a location.`;

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
              latitude: z.coerce.number(),
              longitude: z.coerce.number(),
            })
            .strip(),
        ]),
        start_date: z
          .string()
          .date()
          .describe("Start date for the weather forecast in the format YYYY-MM-DD (UTC)"),
        end_date: z
          .string()
          .date()
          .describe("End date for the weather forecast in the format YYYY-MM-DD (UTC)")
          .optional(),
        temperature_unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
      })
      .strip();
  }

  static {
    this.register();
  }

  public constructor(options: Partial<ToolOptions> = {}) {
    super({ ...options, daily: options?.daily ?? true, hourly: options?.hourly ?? true });
  }
  protected preprocessInput(rawInput: unknown) {
    super.preprocessInput(rawInput);

    const fixDate = (key: keyof ToolInput<this>) => {
      const value = getProp(rawInput, [key]);
      if (value) {
        setProp(rawInput, [key], value.substring(0, 10));
      }
    };

    fixDate("start_date");
    fixDate("end_date");
  }

  protected async _run(
    { location, start_date: startDate, end_date: endDate, ...input }: ToolInput<this>,
    _options: BaseToolRunOptions | undefined,
    run: RunContext<this>,
  ) {
    const { apiKey, daily, hourly } = this.options;

    const prepareParams = async () => {
      const extractLocation = async (): Promise<Location> => {
        if ("name" in location) {
          const response = await this._geocode(location, run.signal);
          return pick(response, ["latitude", "longitude"]);
        }
        return location;
      };

      const now = new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      const end = endDate
        ? new Date(endDate)
        : new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

      const toDateString = (date: Date) => date.toISOString().split("T")[0];

      return createURLParams({
        ...pickBy(input, (v) => !isNullish(v) && v !== ""),
        ...(await extractLocation()),
        start_date: toDateString(start),
        end_date: toDateString(end),
        current: ["temperature_2m", "rain", "relative_humidity_2m", "wind_speed_10m"],
        ...(daily && { daily: ["temperature_2m_max", "temperature_2m_min", "rain_sum"] }),
        ...(hourly && { hourly: ["temperature_2m", "relative_humidity_2m", "rain"] }),
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

    const data: OpenMeteoToolResponse = omit(
      await response.json(),
      omittedKeys,
    ) as unknown as OpenMeteoToolResponse;

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
