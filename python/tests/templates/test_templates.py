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


from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from pydantic import BaseModel, ValidationError

from beeai_framework.utils.errors import PromptTemplateError
from beeai_framework.utils.templates import PromptTemplate


@pytest.fixture
def template() -> PromptTemplate:
    class TestPromptInputSchema(BaseModel):
        task: str
        count: int

    template = PromptTemplate(schema=TestPromptInputSchema, template="""This is the task: {{task}}{{count}}""")

    return template


@pytest.mark.unit
def test_render_valid(template: PromptTemplate) -> None:
    assert template.render({"task": "Test", "count": 1}) == "This is the task: Test1"


@pytest.mark.unit
def test_render_invalid_missing(template: PromptTemplate) -> None:
    with pytest.raises(ValidationError):
        template.render({"task": "Test"})


@pytest.mark.unit
def test_render_invalid_type(template: PromptTemplate) -> None:
    with pytest.raises(ValidationError):
        template.render({"task": 1, "count": 1})


@pytest.mark.unit
def test_render_function(template: PromptTemplate) -> None:
    class TestPromptInputSchema(BaseModel):
        task: str

    template = PromptTemplate(
        schema=TestPromptInputSchema,
        functions={"formatDate": lambda: datetime.now(ZoneInfo("US/Eastern")).strftime("%A, %B %d, %Y at %I:%M:%S %p")},
        template="""{{task}} {{formatDate}}""",
    )

    template.render(TestPromptInputSchema(task="Here is a task!"))


@pytest.mark.unit
def test_render_function_clash(template: PromptTemplate) -> None:
    class TestPromptInputSchema(BaseModel):
        task: str

    template = PromptTemplate(
        schema=TestPromptInputSchema,
        functions={"task": lambda: "Clashing task!"},
        template="""{{task}}""",
    )

    with pytest.raises(PromptTemplateError):
        template.render(TestPromptInputSchema(task="Here is a task!"))
