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
from collections.abc import Sequence
from enum import StrEnum


def trim_left_spaces(value: str) -> str:
    """Remove all whitespace from the left side of the string."""
    return re.sub(r"^\s*", "", value)


def split_string(input: str, size: int = 25, overlap: int = 0) -> list[str]:
    if size <= 0:
        raise ValueError("size must be greater than 0")
    if overlap < 0:
        raise ValueError("overlap must be non-negative")
    if overlap >= size:
        raise ValueError("overlap must be less than size")

    chunks = []
    step = size - overlap  # The number of characters to move forward for each chunk
    for i in range(0, len(input), step):
        chunks.append(input[i : i + size])
    return chunks


def create_strenum(name: str, keys: Sequence[str]) -> StrEnum:
    return StrEnum(name, {value: value for value in keys})
