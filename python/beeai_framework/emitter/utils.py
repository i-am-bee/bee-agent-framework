# SPDX-License-Identifier: Apache-2.0

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
