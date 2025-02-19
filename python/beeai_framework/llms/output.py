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


from collections.abc import Sequence
from dataclasses import dataclass

from beeai_framework.backend import AssistantMessage
from beeai_framework.llms.base_output import BaseChatLLMOutput


@dataclass
class ChatOutput:
    """Represents a chat output from Ollama LLM."""

    response: str

    def to_messages(self) -> list[AssistantMessage]:
        """Convert the response to a list of messages."""
        return [AssistantMessage(self.response)]


@dataclass
class ChatLLMOutput(BaseChatLLMOutput):
    """Concrete implementation of ChatLLMOutput for Ollama."""

    output: ChatOutput

    @property
    def messages(self) -> Sequence[AssistantMessage]:
        return self.output.to_messages()
