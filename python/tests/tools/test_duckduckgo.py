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


import pytest

from beeai_framework.tools import ToolInputValidationError
from beeai_framework.tools.search.duckduckgo import (
    DuckDuckGoSearchTool,
    DuckDuckGoSearchToolInput,
    DuckDuckGoSearchToolOutput,
)


@pytest.fixture
def tool() -> DuckDuckGoSearchTool:
    return DuckDuckGoSearchTool()


@pytest.mark.unit
def test_call_invalid_input_type(tool: DuckDuckGoSearchTool) -> None:
    with pytest.raises(ToolInputValidationError):
        tool.run(input={"search": "Poland"})


@pytest.mark.e2e
def test_output(tool: DuckDuckGoSearchTool) -> None:
    result = tool.run(input=DuckDuckGoSearchToolInput(query="What is the area of the Poland?"))
    assert type(result) is DuckDuckGoSearchToolOutput
    assert "322,575" in result.get_text_content()
