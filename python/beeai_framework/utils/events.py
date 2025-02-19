# SPDX-License-Identifier: Apache-2.0

from dataclasses import dataclass


@dataclass
class MessageEvent:
    source: str
    message: str
    state: str | None = None
