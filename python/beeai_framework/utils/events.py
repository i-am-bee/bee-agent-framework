# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass
from typing import Literal


@dataclass
class MessageEvent:
    source: Literal["User", "Agent"]
    message: str
    state: str | None = None
