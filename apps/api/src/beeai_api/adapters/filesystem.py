import json
from pathlib import Path
from typing import AsyncIterator, Callable

import yaml
from anyio import Path as AsyncPath
from pydantic import BaseModel

from beeai_api.adapters.interface import IProviderRepository, RepositoryEventType
from beeai_api.domain.model import Provider


class ProviderConfigFile(BaseModel):
    providers: list[Provider]


class FilesystemProviderRepository(IProviderRepository):
    def __init__(self, provider_config_path: Path):
        self._config_path = AsyncPath(provider_config_path)
        self._subscribers: set[Callable[[RepositoryEventType], None]] = set()

    def subscribe(self, *, handler: Callable[[RepositoryEventType], None]) -> None:
        self._subscribers.add(handler)

    def unsubscribe(self, *, handler: Callable[[RepositoryEventType], None]) -> None:
        self._subscribers.remove(handler)

    def _notify_subscribers(self, event: RepositoryEventType) -> None:
        for handler in self._subscribers:
            handler(event)

    async def _write_config(self, providers: list[Provider]) -> None:
        # Ensure that path exists
        await self._config_path.parent.mkdir(parents=True, exist_ok=True)
        config = json.dumps(ProviderConfigFile(providers=providers).model_dump(mode="json"), indent=2)
        await self._config_path.write_text(config)

    async def _read_config(self) -> list[Provider]:
        if not await self._config_path.exists():
            return []

        config = await self._config_path.read_text()
        return ProviderConfigFile.model_validate(yaml.safe_load(config)).providers

    async def list(self) -> AsyncIterator[Provider]:
        for provider in await self._read_config():
            yield provider

    async def create(self, *, provider: Provider) -> None:
        providers = [provider async for provider in self.list()]
        if provider not in providers:
            providers.append(provider)
            await self._write_config(providers)
            self._notify_subscribers(RepositoryEventType.CREATE)

    async def delete(self, *, provider: Provider) -> None:
        repository_providers = [provider async for provider in self.list()]
        new_providers = [prov for prov in repository_providers if prov != provider]
        if len(new_providers) != len(repository_providers):
            await self._write_config(new_providers)
            self._notify_subscribers(RepositoryEventType.DELETE)
