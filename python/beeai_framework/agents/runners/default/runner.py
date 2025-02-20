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
from collections.abc import Callable
from typing import Any

from beeai_framework.agents.runners.base import (
    BaseRunner,
    BeeRunnerLLMInput,
    BeeRunnerToolInput,
    BeeRunnerToolResult,
)
from beeai_framework.agents.runners.default.prompts import (
    AssistantPromptTemplate,
    SystemPromptTemplate,
    SystemPromptTemplateInput,
    ToolDefinition,
    ToolInputErrorTemplate,
    ToolNotFoundErrorTemplate,
    UserPromptTemplate,
)
from beeai_framework.agents.types import (
    BeeAgentRunIteration,
    BeeAgentTemplates,
    BeeIterationResult,
    BeeRunInput,
)
from beeai_framework.backend.chat import ChatModelInput, ChatModelOutput
from beeai_framework.backend.message import SystemMessage, UserMessage
from beeai_framework.emitter.emitter import Emitter, EventMeta
from beeai_framework.memory.base_memory import BaseMemory
from beeai_framework.memory.token_memory import TokenMemory
from beeai_framework.parsers.field import ParserField
from beeai_framework.parsers.line_prefix import LinePrefixParser, LinePrefixParserNode
from beeai_framework.tools import ToolError, ToolInputValidationError
from beeai_framework.tools.tool import StringToolOutput, Tool, ToolOutput
from beeai_framework.utils.strings import create_strenum


class DefaultRunner(BaseRunner):
    def default_templates(self) -> BeeAgentTemplates:
        return BeeAgentTemplates(
            system=SystemPromptTemplate,
            assistant=AssistantPromptTemplate,
            user=UserPromptTemplate,
            tool_not_found_error=ToolNotFoundErrorTemplate,
            tool_input_error=ToolInputErrorTemplate,
        )

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
                    prefix="Function Name: ",
                    field=ParserField.from_type(tool_names, lambda v: v.trim()),
                    next=["tool_input"],
                ),  # validate enum
                "tool_input": LinePrefixParserNode(
                    prefix="Function Input: ",
                    field=ParserField.from_type(dict),
                    next=["tool_output"],
                ),
                "tool_output": LinePrefixParserNode(
                    prefix="Function Input: ", field=ParserField.from_type(str), is_end=True, next=["final_answer"]
                ),
                "final_answer": LinePrefixParserNode(
                    prefix="Final Answer: ", field=ParserField.from_type(str), is_end=True, is_start=True
                ),
            }
        )

    async def llm(self, input: BeeRunnerLLMInput) -> BeeAgentRunIteration:
        state: dict[str, Any] = {}
        parser = self.create_parser()

        async def new_token(value: tuple[ChatModelOutput, Callable], event: EventMeta) -> None:
            data, abort = value
            chunk = data.get_text_content()

            for result in parser.feed(chunk):
                if result is not None:
                    state[result.prefix.name] = result.content

                    if result.prefix.terminal:
                        abort()

        async def observe(llm_emitter: Emitter) -> None:
            llm_emitter.on("newToken", new_token)

        output: ChatModelOutput = await self._input.llm.create(
            ChatModelInput(messages=self.memory.messages[:], stream=True)
        ).observe(fn=observe)

        # Pick up any remaining lines in parser buffer
        for result in parser.finalize():
            if result is not None:
                state[result.prefix.name] = result.content

        return BeeAgentRunIteration(raw=output, state=BeeIterationResult(**state))

    async def tool(self, input: BeeRunnerToolInput) -> BeeRunnerToolResult:
        tool: Tool | None = next(
            (
                tool
                for tool in self._input.tools
                if tool.name.strip().upper() == (input.state.tool_name or "").strip().upper()
            ),
            None,
        )

        if tool is None:
            self._failedAttemptsCounter.use(
                Exception(f"Agent was trying to use non-existing tool '${input.state.tool_name}'")
            )

            return BeeRunnerToolResult(
                success=False,
                output=StringToolOutput(
                    self.templates.tool_not_found_error.render(
                        {
                            "tools": self._input.tools,
                        }
                    )
                ),
            )

        try:
            # tool_options = copy.copy(self._options)
            # TODO Tool run is not async
            # Convert tool input to dict
            tool_input = json.loads(input.state.tool_input or "")
            tool_output: ToolOutput = tool.run(tool_input, options={})  # TODO: pass tool options
            return BeeRunnerToolResult(output=tool_output, success=True)
        # TODO These error templates should be customized to help the LLM to recover
        except ToolInputValidationError as e:
            self._failed_attempts_counter.use(e)
            return BeeRunnerToolResult(
                success=False,
                output=StringToolOutput(self.templates.tool_input_error.render({"reason": str(e)})),
            )

        except ToolError as e:
            self._failed_attempts_counter.use(e)

            return BeeRunnerToolResult(
                success=False,
                output=StringToolOutput(self.templates.tool_input_error.render({"reason": str(e)})),
            )
        except json.JSONDecodeError as e:
            self._failed_attempts_counter.use(e)
            return BeeRunnerToolResult(
                success=False,
                output=StringToolOutput(self.templates.tool_input_error.render({"reason": str(e)})),
            )

    async def init_memory(self, input: BeeRunInput) -> BaseMemory:
        memory = TokenMemory(
            capacity_threshold=0.85, sync_threshold=0.5, llm=self._input.llm
        )  # TODO handlers needs to be fixed

        tool_defs = []

        for tool in self._input.tools:
            tool_defs.append(ToolDefinition(**tool.prompt_data()))

        system_prompt: str = self.templates.system.render(
            SystemPromptTemplateInput(
                tools=tool_defs,
                tools_length=len(tool_defs),  # TODO Where do instructions come from
            )
        )

        messages = [
            SystemMessage(content=system_prompt),
            *self._input.memory.messages,
        ]

        if input.prompt:
            messages.append(UserMessage(content=input.prompt))

        if len(messages) <= 1:
            raise ValueError("At least one message must be provided.")

        await memory.add_many(messages=messages)

        return memory
