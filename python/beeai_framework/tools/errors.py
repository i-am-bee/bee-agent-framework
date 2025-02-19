# SPDX-License-Identifier: Apache-2.0

from beeai_framework.errors import FrameworkError


class ToolError(FrameworkError):
    def __init__(self, message: str = "Tool Error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)


class ToolInputValidationError(FrameworkError):
    def __init__(self, message: str = "Tool Input Validation Error", *, cause: Exception | None = None) -> None:
        super().__init__(message, is_fatal=True, is_retryable=False, cause=cause)
