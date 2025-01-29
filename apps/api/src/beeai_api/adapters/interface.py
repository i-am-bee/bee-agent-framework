from typing import runtime_checkable, Protocol, AsyncIterator

from beeai_api.domain.model import Registry


@runtime_checkable
class IRegistryRepository(Protocol):
    async def list(self) -> AsyncIterator[Registry]:
        yield

    async def create(self, *, registry: Registry) -> None: ...
    async def delete(self, *, registry: Registry) -> None: ...
