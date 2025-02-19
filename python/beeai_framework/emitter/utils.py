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


import re

from beeai_framework.emitter.errors import EmitterError


def assert_valid_name(name: str) -> None:
    if not name or not re.match("^[a-zA-Z0-9_]+$", name):
        raise EmitterError(
            "Event name or a namespace part must contain only letters, numbers or underscores.",
        )


def assert_valid_namespace(path: list[str]) -> None:
    for part in path:
        assert_valid_name(part)
