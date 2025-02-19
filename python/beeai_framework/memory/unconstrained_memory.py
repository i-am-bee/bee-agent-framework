# SPDX-License-Identifier: Apache-2.0

from copy import copy

from beeai_framework.backend import Message
from beeai_framework.memory.base_memory import BaseMemory


class UnconstrainedMemory(BaseMemory):
    """Simple memory implementation with no constraints."""

    def __init__(self) -> None:
        self._messages: list[Message] = []

    @property
    def messages(self) -> list[Message]:
        return self._messages

    async def add(self, message: Message, index: int | None = None) -> None:
        index = len(self._messages) if index is None else max(0, min(index, len(self._messages)))
        self._messages.insert(index, message)

    async def delete(self, message: Message) -> bool:
        try:
            self._messages.remove(message)
            return True
        except ValueError:
            return False

    def reset(self) -> None:
        self._messages.clear()

    def create_snapshot(self) -> dict:
        return {"messages": copy(self._messages)}

    def load_snapshot(self, state: dict) -> None:
        self._messages = copy(state["messages"])
