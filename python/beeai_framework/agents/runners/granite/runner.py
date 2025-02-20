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

from beeai_framework.agents.runners.default.runner import DefaultRunner
from beeai_framework.agents.runners.granite.prompts import (
    GraniteAssistantPromptTemplate,
    GraniteSystemPromptTemplate,
    GraniteToolInputErrorTemplate,
    GraniteToolNotFoundErrorTemplate,
    GraniteUserPromptTemplate,
)
from beeai_framework.agents.types import BeeAgentTemplates, BeeRunInput
from beeai_framework.backend.message import Message, MessageInput
from beeai_framework.memory.base_memory import BaseMemory
from beeai_framework.parsers.field import ParserField
from beeai_framework.parsers.line_prefix import LinePrefixParser, LinePrefixParserNode
from beeai_framework.utils.strings import create_strenum


class GraniteRunner(DefaultRunner):
    def create_parser(self) -> LinePrefixParser:
        tool_names = create_strenum("ToolsEnum", [tool.name for tool in self._input.tools])

        return LinePrefixParser(
            {
                "thought": LinePrefixParserNode(
                    prefix="Thought: ",
                    field=ParserField.from_type(str),
                    is_start=True,
                    next=["tool_name", "final_answer"],
                ),
                "tool_name": LinePrefixParserNode(
                    prefix="Tool Name: ",
                    field=ParserField.from_type(tool_names, lambda v: v.trim()),
                    next=["tool_input"],
                ),  # validate enum
                "tool_input": LinePrefixParserNode(
                    prefix="Tool Input: ", field=ParserField.from_type(dict), next=["tool_output"]
                ),
                "tool_output": LinePrefixParserNode(
                    prefix="Function Input: ", field=ParserField.from_type(str), is_end=True, next=["final_answer"]
                ),
                "final_answer": LinePrefixParserNode(
                    prefix="Final Answer: ", field=ParserField.from_type(str), is_end=True, is_start=True
                ),
            }
        )

    def default_templates(self) -> BeeAgentTemplates:
        return BeeAgentTemplates(
            system=GraniteSystemPromptTemplate,
            assistant=GraniteAssistantPromptTemplate,
            user=GraniteUserPromptTemplate,
            tool_not_found_error=GraniteToolNotFoundErrorTemplate,
            tool_input_error=GraniteToolInputErrorTemplate,
        )

    async def init_memory(self, input: BeeRunInput) -> BaseMemory:
        """Insert tool message after the system prompt"""
        memory = await super().init_memory(input)
        # insert tools

        if self._input.tools and len(self._input.tools) > 0:
            memory.messages.insert(
                1,
                Message.of(
                    MessageInput(
                        role="available_tools",
                        text="\n".join(json.dumps(tool.prompt_data(), indent=4) for tool in self._input.tools),
                    ).model_dump()
                ),
            )

        return memory
