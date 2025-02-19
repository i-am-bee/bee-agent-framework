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


import math
import re
from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from typing import Any, Generic, TypeVar

from litellm import completion

from beeai_framework.backend import Message, Role
from beeai_framework.llms.base_output import BaseChatLLMOutput
from beeai_framework.llms.output import ChatLLMOutput, ChatOutput
from beeai_framework.memory.base_memory import BaseMemory
from beeai_framework.tools.tool import Tool
from beeai_framework.utils.custom_logger import BeeLogger
from beeai_framework.utils.templates import Prompt

T = TypeVar("T", bound="BaseChatLLMOutput")
logger = BeeLogger(__name__)


class BaseLLM(Generic[T], ABC):
    """Abstract base class for Language Model implementations."""

    base_url: str | None
    model: str | None

    def __init__(self, base_url: str | None = None, model: str | None = None) -> None:
        self.base_url = base_url

        if "/" not in model:
            self.model = f"ollama_chat/{model}"
        else:
            self.model = model if not model.startswith("ollama/") else f"{model.replace('ollama/', 'ollama_chat/')}"

    @abstractmethod
    def inference(self, input: list[Message], options: Any) -> T:
        pass

    # TODO: define the type annotation for output (Message???) and remove noqa
    @abstractmethod
    def parse_output(self, output, tools: list[Tool]) -> str:  # noqa: ANN001
        pass

    def generate(self, prompt: Prompt | list[Message], options: Any = None) -> T:
        if type(prompt) is dict:  # noqa: SIM108
            input = [Message.of({"role": Role.USER, "text": prompt.get("prompt")})]
        else:
            input = prompt

        answer = self.inference(input, options)
        return answer

    @abstractmethod
    def tokenize(self, input: str) -> T:
        pass


class LLM(BaseLLM[BaseChatLLMOutput]):
    parameters: dict[str, Any]
    chat_endpoint = "/api/chat"

    def __init__(
        self,
        model: str = "ollama_chat/llama3.1",
        base_url: str | None = None,
        api_key: str | None = None,
        parameters: dict[str, Any] | None = None,
    ) -> None:
        if parameters is None:
            parameters = {}
        self.api_key = api_key

        h = base_url[:-1] if base_url and base_url.endswith("/") else base_url
        self.parameters = {
            "temperature": 0,
            "repeat_penalty": 1.0,
            "num_predict": 2048,
        } | parameters

        super().__init__(h, model)

    # TODO: add return type and remove noqa
    def prepare_messages(self, input: list[Message]):  # noqa: ANN201
        return [{"role": x.role, "content": x.text} for x in input]

    def inference(self, input: list[Message], options: Any) -> T:
        messages = self.prepare_messages(input)
        logger.trace(f"LLM input:\n{messages}")
        response = completion(
            model=self.model, messages=messages, base_url=self.base_url, api_key=self.api_key, **options
        )

        logger.debug(f"Inference response choices size: {len(response.choices)}")
        response_content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
        logger.trace(f"Inference response content:\n{response_content}")

        return ChatLLMOutput(output=ChatOutput(response=response_content))

    async def stream(self, input: list[Message], options: Any) -> AsyncGenerator[str, None]:
        messages = self.prepare_messages(input)
        response = completion(
            model=self.model, messages=messages, base_url=self.base_url, api_key=self.api_key, stream=True, **options
        )
        for chunk in response:
            yield chunk.choices[0].delta.content or ""

    def tokenize(self, input: str) -> T:
        return {"tokens_count": math.ceil(len(input) / 4)}

    # TODO: define the type annotation for output (Message???) and remove noqa
    def parse_output(self, output, tools: list[Tool]) -> None:  # noqa: ANN001
        if len(tools):
            regex = (
                r"Thought: .+\n+(?:Final Answer: [\s\S]+|Function Name: ("
                + "|".join([x.name for x in tools])
                + ")\n+Function Input: \\{.*\\}(\n+Function Output:)?)"
            )
        else:
            regex = r"Thought: .+\n+Final Answer: [\s\S]+"
        r = re.search(regex, output.text)
        if r is not None:
            return r.group()


@dataclass
class AgentInput(Generic[T]):
    """Input configuration for agent initialization."""

    llm: BaseLLM[T]
    memory: "BaseMemory"
