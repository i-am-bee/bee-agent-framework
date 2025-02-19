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


from beeai_framework.tools.tool import Tool


class WikipediaTool(Tool):
    name = "Wikipedia"
    description = "Search factual and historical information, including biography, history, politics, geography, society, culture, science, technology, people, animal species, mathematics, and other subjects."  # noqa: E501

    def input_schema(self) -> str:
        # TODO: remove hard code
        return '{"type":"object","properties":{"query":{"type":"string","format":"date","description":"Name of the wikipedia page, for example \'New York\'"}}}'  # noqa: E501

    def _run(self) -> None:
        pass
