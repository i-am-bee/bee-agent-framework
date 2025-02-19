# SPDX-License-Identifier: Apache-2.0

from beeai_framework.errors import FrameworkError


class BackendError(FrameworkError):
    def __init__(
        self,
        message: str = "Backend error",
        *,
        is_fatal: bool = True,
        is_retryable: bool = False,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message, is_fatal=is_fatal, is_retryable=is_retryable, cause=cause)


class ChatModelError(BackendError):
    def __init__(self, message: str = "Chat Model error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)


class MessageError(FrameworkError):
    def __init__(self, message: str = "Message Error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)
