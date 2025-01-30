from typing import runtime_checkable, Protocol, AsyncIterator

from beeai_api.domain.model import Provider


@runtime_checkable
class IProviderRepository(Protocol):
    async def list(self) -> AsyncIterator[Provider]:
        yield

    async def create(self, *, provider: Provider) -> None: ...
    async def delete(self, *, provider: Provider) -> None: ...
