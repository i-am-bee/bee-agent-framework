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


class RetryCounter:
    def __init__(self, error_type: type[BaseException], max_retries: int = 0) -> None:
        self._max_retries = max_retries
        self.error_type = error_type
        self.remaining = max_retries

        self._error_class: type[BaseException] = error_type  # TODO: FrameworkError
        self._lastError: BaseException | None = None
        self._finalError: BaseException | None = None

    def use(self, error: BaseException) -> None:
        if self._finalError:
            raise self._finalError

        self._lastError = error or self._lastError
        self.remaining -= 1

        # TODO: ifFatal, isRetryable etc
        if self.remaining < 0:
            self._finalError = self._error_class(
                f"Maximal amount of global retries (${self._max_retries}) has been reached."
            )
            raise self._finalError
