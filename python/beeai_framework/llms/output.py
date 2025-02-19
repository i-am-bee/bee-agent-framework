# SPDX-License-Identifier: Apache-2.0

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
