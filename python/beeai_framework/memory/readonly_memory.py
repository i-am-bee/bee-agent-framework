# SPDX-License-Identifier: Apache-2.0

from beeai_framework.backend import Message
from beeai_framework.memory.base_memory import BaseMemory


class ReadOnlyMemory(BaseMemory):
    """Read-only wrapper for a memory instance."""

    def __init__(self, source: BaseMemory) -> None:
        self.source = source

    @property
    def messages(self) -> list[Message]:
        return self.source.messages

    async def add(self, message: Message, index: int | None = None) -> None:
        pass  # No-op for read-only memory

    async def delete(self, message: Message) -> bool:
        return False  # No-op for read-only memory

    def reset(self) -> None:
        pass  # No-op for read-only memory

    def create_snapshot(self) -> dict:
        return {"source": self.source}

    def load_snapshot(self, state: dict) -> None:
        self.source = state["source"]

    def as_read_only(self) -> "ReadOnlyMemory":
        """Return self since already read-only."""
        return self
