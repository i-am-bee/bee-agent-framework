# SPDX-License-Identifier: Apache-2.0

from collections.abc import Iterable
from typing import TYPE_CHECKING

from beeai_framework.backend import Message, SystemMessage
from beeai_framework.backend.message import UserMessage
from beeai_framework.memory.base_memory import BaseMemory

if TYPE_CHECKING:
    from beeai_framework.llms import BaseLLM


class SummarizeMemory(BaseMemory):
    """Memory implementation that summarizes conversations."""

    def __init__(self, llm: "BaseLLM") -> None:
        self._messages: list[Message] = []
        self.llm = llm

    @property
    def messages(self) -> list[Message]:
        return self._messages

    async def add(self, message: Message, index: int | None = None) -> None:
        """Add a message and trigger summarization if needed."""
        messages_to_summarize = [*self._messages, message]
        summary = self._summarize_messages(messages_to_summarize)

        self._messages = [SystemMessage(summary)]

    async def add_many(self, messages: Iterable[Message], start: int | None = None) -> None:
        """Add multiple messages and summarize."""
        messages_to_summarize = self._messages + list(messages)
        summary = await self._summarize_messages(messages_to_summarize)

        self._messages = [SystemMessage(summary)]

    async def _summarize_messages(self, messages: list[Message]) -> str:
        """Summarize a list of messages using the LLM."""
        if not messages:
            return ""

        prompt = UserMessage(
            """Summarize the following conversation. Be concise but include all key information.

Previous messages:
{}

Summary:""".format("\n".join([f"{msg.role}: {msg.text}" for msg in messages]))
        )

        # Generate is synchronous, not async
        response = await self.llm.create({"messages": [prompt]})

        return response.messages[0].get_texts()[0].get("text")

    async def delete(self, message: Message) -> bool:
        """Delete a message from memory."""
        try:
            self._messages.remove(message)
            return True
        except ValueError:
            return False

    def reset(self) -> None:
        """Clear all messages from memory."""
        self._messages.clear()

    def create_snapshot(self) -> dict:
        """Create a serializable snapshot of current state."""
        return {"messages": self._messages.copy()}

    def load_snapshot(self, state: dict) -> None:
        """Restore state from a snapshot."""
        self._messages = state["messages"].copy()
