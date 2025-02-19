# SPDX-License-Identifier: Apache-2.0

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
