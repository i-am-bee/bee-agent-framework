# SPDX-License-Identifier: Apache-2.0

import time
from collections import OrderedDict
from typing import Any, Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


class Task:
    def __init__(self) -> None:
        self._value = None
        self._state = "pending"
        self._resolved = False

    def resolve(self, value: Any) -> None:
        self._value = value
        self._state = "resolved"
        self._resolved = True

    def get_value(self) -> Any:
        return self._value

    def get_state(self) -> str:
        return self._state

    def is_resolved(self) -> bool:
        return self._resolved

    @classmethod
    def from_snapshot(cls, snapshot: dict[str, Any]) -> "Task":
        """Create instance from snapshot data."""
        task = cls()
        if snapshot["state"] == "resolved":
            task.resolve(snapshot["value"])
        return task

    def load_snapshot(self, snapshot: dict[str, Any]) -> None:
        """Load state from snapshot data."""
        if snapshot["state"] == "resolved":
            self.resolve(snapshot["value"])


class SlidingTaskMap(Generic[K, V]):
    """
    A size-limited map that evicts oldest entries when full.
    Optionally supports TTL-based eviction.
    """

    def __init__(self, size: float, ttl: float | None = None) -> None:
        """
        Initialize the sliding map.

        Args:
            size: Maximum number of items to store
            ttl: Time-to-live in seconds for entries (optional)
        """
        self._max_size = size
        self._ttl = ttl
        self._items: OrderedDict[K, tuple[V, float]] = OrderedDict()

    def _evict_expired(self) -> None:
        """Remove expired entries based on TTL."""
        if self._ttl is None:
            return

        current_time = time.time()
        expired_keys = [key for key, (_, timestamp) in self._items.items() if current_time - timestamp > self._ttl]

        for key in expired_keys:
            self.delete(key)

    def get(self, key: K) -> V | None:
        """Get a value by key, handling expiration."""
        self._evict_expired()
        if key in self._items:
            value, _ = self._items[key]
            # Move to end to mark as recently used
            self._items.move_to_end(key)
            return value
        return None

    def set(self, key: K, value: V) -> None:
        """Set a value, handling size limits."""
        self._evict_expired()

        # If we're at max size and this is a new key, remove oldest
        if len(self._items) >= self._max_size and key not in self._items:
            self._items.popitem(last=False)

        self._items[key] = (value, time.time())
        self._items.move_to_end(key)

    def has(self, key: K) -> bool:
        """Check if a key exists and hasn't expired."""
        self._evict_expired()
        return key in self._items

    def delete(self, key: K) -> bool:
        """Delete a key, returning True if it existed."""
        if key in self._items:
            value, _ = self._items.pop(key)
            if isinstance(value, Task):
                value.destructor()
            return True
        return False

    def clear(self) -> None:
        """Remove all items."""
        for key in list(self._items.keys()):
            self.delete(key)

    @property
    def size(self) -> int:
        """Get current number of items."""
        self._evict_expired()
        return len(self._items)

    @property
    def ttl(self) -> float | None:
        """Get the TTL value."""
        return self._ttl

    def entries(self) -> list[tuple[K, V]]:
        """Get all entries for serialization."""
        return [(k, v[0]) for k, v in self._items.items()]

    @classmethod
    def from_snapshot(cls, snapshot: dict[str, Any]) -> "SlidingTaskMap":
        """Create instance from snapshot data."""
        instance = cls(size=snapshot["config"]["size"], ttl=snapshot["config"]["ttl"])
        for key, value in snapshot["entries"]:
            instance.set(key, value)
        return instance

    def load_snapshot(self, snapshot: dict[str, Any]) -> None:
        """Load state from snapshot data."""
        self._size = snapshot["config"]["size"]
        self._ttl = snapshot["config"]["ttl"]
        self._items.clear()
        current_time = time.time()
        for key, value in snapshot["entries"]:
            self._items[key] = (value, current_time)
