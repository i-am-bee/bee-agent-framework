# SPDX-License-Identifier: Apache-2.0

from beeai_framework.errors import FrameworkError


class EmitterError(FrameworkError):
    """Raised for errors caused by emitters."""

    def __init__(self, message: str = "Emitter error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)
