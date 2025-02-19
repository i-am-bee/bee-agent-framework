# SPDX-License-Identifier: Apache-2.0

from pydantic import BaseModel, InstanceOf


class EventTrace(BaseModel):
    id: str
    run_id: str
    parent_run_id: str | None = None


class EmitterInput(BaseModel):
    group_id: str | None = None
    namespace: list[str] | None = None
    creator: object | None = None
    context: object | None = None
    trace: InstanceOf[EventTrace] | None = None


class EmitterOptions(BaseModel, frozen=True):
    is_blocking: bool | None = None
    once: bool | None = None
    persistent: bool | None = None
    match_nested: bool | None = None
