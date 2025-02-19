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


from copy import copy
from math import ceil
from typing import Any

from beeai_framework.backend import Message
from beeai_framework.memory.base_memory import BaseMemory


def simple_estimate(msg: Message) -> int:
    return ceil(len(msg.text) / 4)


async def simple_tokenize(msgs: list[Message]) -> int:
    return sum(map(simple_estimate, msgs))


class TokenMemory(BaseMemory):
    """Memory implementation that respects token limits."""

    def __init__(
        self,
        llm: Any,
        max_tokens: int | None = None,
        sync_threshold: float = 0.25,
        capacity_threshold: float = 0.75,
        handlers: dict | None = None,
    ) -> None:
        self._messages: list[Message] = []
        self.llm = llm
        self.max_tokens = max_tokens
        self.threshold = capacity_threshold
        self.sync_threshold = sync_threshold
        self._tokens_by_message = {}

        self.handlers = {
            "estimate": (handlers.get("estimate", self._default_estimate) if handlers else self._default_estimate),
            "removal_selector": (
                handlers.get("removal_selector", lambda msgs: msgs[0]) if handlers else lambda msgs: msgs[0]
            ),
            "tokenize": (handlers.get("tokenize", simple_tokenize) if handlers else simple_tokenize),
        }

        if not 0 <= self.threshold <= 1:
            raise ValueError('"capacity_threshold" must be a number in range (0, 1)')

    @staticmethod
    def _default_estimate(msg: Message) -> int:
        return int((len(msg.role) + len(msg.text)) / 4)

    def _get_message_key(self, message: Message) -> str:
        """Generate a unique key for a message."""
        return f"{message.role}:{message.text}"

    @property
    def messages(self) -> list[Message]:
        return self._messages

    @property
    def tokens_used(self) -> int:
        return sum(info.get("tokens_count", 0) for info in self._tokens_by_message.values())

    @property
    def is_dirty(self) -> bool:
        return any(info.get("dirty", True) for info in self._tokens_by_message.values())

    async def sync(self) -> None:
        """Synchronize token counts with LLM."""
        for msg in self._messages:
            key = self._get_message_key(msg)
            cache = self._tokens_by_message.get(key, {})
            if cache.get("dirty", True):
                try:
                    result = await self.handlers["tokenize"]([msg])
                    self._tokens_by_message[key] = {
                        "tokens_count": result,
                        "dirty": False,
                    }
                except Exception as e:
                    print(f"Error tokenizing message: {e!s}")
                    self._tokens_by_message[key] = {
                        "tokens_count": self.handlers["estimate"](msg),
                        "dirty": True,
                    }

    async def add(self, message: Message, index: int | None = None) -> None:
        index = len(self._messages) if index is None else max(0, min(index, len(self._messages)))
        self._messages.insert(index, message)

        key = self._get_message_key(message)
        estimated_tokens = self.handlers["estimate"](message)
        self._tokens_by_message[key] = {
            "tokens_count": estimated_tokens,
            "dirty": True,
        }

        dirty_count = sum(1 for info in self._tokens_by_message.values() if info.get("dirty", True))
        if len(self._messages) > 0 and dirty_count / len(self._messages) >= self.sync_threshold:
            await self.sync()

    async def delete(self, message: Message) -> bool:
        try:
            key = self._get_message_key(message)
            self._messages.remove(message)
            self._tokens_by_message.pop(key, None)
            return True
        except ValueError:
            return False

    def reset(self) -> None:
        self._messages.clear()
        self._tokens_by_message.clear()

    def create_snapshot(self) -> dict[str, Any]:
        return {
            "messages": copy(self._messages),
            "token_counts": copy(self._tokens_by_message),
        }

    def load_snapshot(self, state: dict[str, Any]) -> None:
        self._messages = copy(state["messages"])
        self._tokens_by_message = copy(state["token_counts"])
