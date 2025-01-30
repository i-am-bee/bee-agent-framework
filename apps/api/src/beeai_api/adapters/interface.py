from enum import StrEnum
from typing import runtime_checkable, Protocol, AsyncIterator, Callable

from beeai_api.domain.model import Provider


class RepositoryEventType(StrEnum):
    DELETE = "delete"
    CREATE = "create"


@runtime_checkable
class IProviderRepository(Protocol):
    async def list(self) -> AsyncIterator[Provider]:
        yield

    async def create(self, *, provider: Provider) -> None: ...
    async def delete(self, *, provider: Provider) -> None: ...

    def subscribe(self, *, handler: Callable[[RepositoryEventType], None]) -> None: ...
    def unsubscribe(self, *, handler: Callable[[RepositoryEventType], None]) -> None: ...
