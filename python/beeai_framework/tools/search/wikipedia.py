# SPDX-License-Identifier: Apache-2.0

from beeai_framework.tools.tool import Tool


class WikipediaTool(Tool):
    name = "Wikipedia"
    description = "Search factual and historical information, including biography, history, politics, geography, society, culture, science, technology, people, animal species, mathematics, and other subjects."  # noqa: E501

    def input_schema(self) -> str:
        # TODO: remove hard code
        return '{"type":"object","properties":{"query":{"type":"string","format":"date","description":"Name of the wikipedia page, for example \'New York\'"}}}'  # noqa: E501

    def _run(self) -> None:
        pass
