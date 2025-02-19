# SPDX-License-Identifier: Apache-2.0

from beeai_framework.errors import FrameworkError


class LoggerError(FrameworkError):
    """Raised for errors caused by logging."""

    def __init__(self, message: str = "Logger error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)


class PromptTemplateError(FrameworkError):
    """Raised for errors caused by PromptTemplate."""

    def __init__(self, message: str = "PromptTemplate error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)
