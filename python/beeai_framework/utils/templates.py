# SPDX-License-Identifier: Apache-2.0

from collections.abc import Callable
from typing import Any, Generic, TypedDict, TypeVar

import chevron
from pydantic import BaseModel

from beeai_framework.utils.errors import PromptTemplateError


class Prompt(TypedDict):
    prompt: str | None


T = TypeVar("T", bound=BaseModel)


class PromptTemplate(Generic[T]):
    def __init__(self, schema: type[T], template: str, functions: dict[str, Callable[[], str]] | None = None) -> None:
        self._schema: type[T] = schema
        self._template: str = template
        self._functions: dict[str, Callable[[], str]] | None = functions

    def validate_input(self, input: T | dict[str, Any]) -> None:
        self._schema.model_validate(input)

    def render(self, input: T | dict[str, Any]) -> str:
        self.validate_input(input)

        # Make sure the data is converted to a dict
        data = input.model_dump() if isinstance(input, BaseModel) else input

        # Apply function derived data
        if self._functions:
            for key in self._functions:
                if key in data:
                    raise PromptTemplateError(f"Function named '{key}' clashes with input data field!")
                data[key] = self._functions[key]()

        return chevron.render(template=self._template, data=data)
