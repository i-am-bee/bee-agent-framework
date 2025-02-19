# SPDX-License-Identifier: Apache-2.0

from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass

from beeai_framework.backend import Message


@dataclass
class BaseLLMOutput:
    """Base class for LLM outputs."""

    pass


class BaseChatLLMOutput(BaseLLMOutput, ABC):
    """Abstract base class for chat LLM outputs."""

    @property
    @abstractmethod
    def messages(self) -> Sequence[Message]:
        """Get the messages from the LLM output.
        Returns:
            Sequence[Message]: A read-only sequence of messages
        """
        raise NotImplementedError
