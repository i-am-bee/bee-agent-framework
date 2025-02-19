# Copyright 2025 IBM Corp.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


import json
from collections import namedtuple
from datetime import UTC, datetime
from typing import Any, Literal
from urllib.parse import urlencode

import requests
from pydantic import BaseModel, Field

from beeai_framework.tools import ToolInputValidationError
from beeai_framework.tools.tool import StringToolOutput, Tool
from beeai_framework.utils import BeeLogger

logger = BeeLogger(__name__)


class OpenMeteoToolInput(BaseModel):
    location_name: str = Field(description="The name of the location to retrieve weather information.")
    country: str | None = Field(description="Country name.", default=None)
    start_date: str | None = Field(
        description="Start date for the weather forecast in the format YYYY-MM-DD (UTC)", default=None
    )
    end_date: str | None = Field(
        description="End date for the weather forecast in the format YYYY-MM-DD (UTC)", default=None
    )
    temperature_unit: Literal["celsius", "fahrenheit"] = Field(
        description="The unit to express temperature", default="celsius"
    )


class OpenMeteoTool(Tool[OpenMeteoToolInput]):
    name = "OpenMeteoTool"
    description = "Retrieve current, past, or future weather forecasts for a location."
    input_schema = OpenMeteoToolInput

    def _geocode(self, input: OpenMeteoToolInput) -> dict[str, Any]:
        params = {"format": "json", "count": 1}
        if input.location_name:
            params["name"] = input.location_name
        if input.country:
            params["country"] = input.country

        params = urlencode(params, doseq=True)

        response = requests.get(
            f"https://geocoding-api.open-meteo.com/v1/search?{params}",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )

        response.raise_for_status()
        results = response.json()["results"]
        return results[0]

    def get_params(self, input: OpenMeteoToolInput) -> dict[str, Any]:
        params = {
            "current": ",".join(
                [
                    "temperature_2m",
                    "rain",
                    "relative_humidity_2m",
                    "wind_speed_10m",
                ]
            ),
            "daily": ",".join(["temperature_2m_max", "temperature_2m_min", "rain_sum"]),
            "timezone": "UTC",
        }

        geocode = self._geocode(input)
        params["latitude"] = geocode.get("latitude")
        params["longitude"] = geocode.get("longitude")

        Dates = namedtuple("Dates", ["start_date", "end_date"])

        def _validate_and_set_dates(start_date: str | None, end_date: str | None) -> Dates:
            # Trim date str assuming YYYY-MM-DD
            def _trim_date(date_str: str) -> str:
                return date_str[0:10]

            start, end = None, None

            if start_date:
                try:
                    start = datetime.strptime(_trim_date(start_date), "%Y-%m-%d").replace(tzinfo=UTC)
                except ValueError as e:
                    raise ToolInputValidationError(
                        "'start_date' is incorrectly formatted, please use the correct format YYYY-MM-DD."
                    ) from e
            else:
                start = datetime.now(UTC)

            if end_date:
                try:
                    end = datetime.strptime(_trim_date(end_date), "%Y-%m-%d").replace(tzinfo=UTC)
                except ValueError as e:
                    raise ToolInputValidationError(
                        "'end_date' is incorrectly formatted, please use the correct format YYYY-MM-DD."
                    ) from e

                if end < start:
                    raise ToolInputValidationError("'end_date' must fall on or after 'start_date'.") from None

            else:
                end = datetime.now(UTC)

            return Dates(start_date=start.strftime("%Y-%m-%d"), end_date=end.strftime("%Y-%m-%d"))

        dates = _validate_and_set_dates(start_date=input.start_date, end_date=input.end_date)

        params["start_date"] = dates.start_date
        params["end_date"] = dates.end_date
        params["temperature_unit"] = input.temperature_unit
        return params

    def _run(self, input: OpenMeteoToolInput, options: Any = None) -> None:
        params = urlencode(self.get_params(input), doseq=True)
        logger.debug(f"Using OpenMeteo URL: https://api.open-meteo.com/v1/forecast?{params}")
        response = requests.get(
            f"https://api.open-meteo.com/v1/forecast?{params}",
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        response.raise_for_status()
        return StringToolOutput(json.dumps(response.json()))
