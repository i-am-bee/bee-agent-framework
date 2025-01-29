import json
from pathlib import Path
from typing import AsyncIterator

import yaml
from anyio import Path as AsyncPath
from pydantic import BaseModel

from beeai_api.adapters.interface import IRegistryRepository
from beeai_api.domain.model import Registry


class RegistryConfigFile(BaseModel):
    registries: list[Registry]


class FilesystemRegistryRepository(IRegistryRepository):
    def __init__(self, registry_path: Path):
        self._registry_path = AsyncPath(registry_path)

    async def _write_registries(self, registries: list[Registry]):
        # Ensure that path exists
        await self._registry_path.parent.mkdir(parents=True, exist_ok=True)
        config = json.dumps(RegistryConfigFile(registries=registries).model_dump(mode="json"), indent=2)
        await self._registry_path.write_text(config)

    async def _read_registries(self) -> list[Registry]:
        if not await self._registry_path.exists():
            return []

        config = await self._registry_path.read_text()
        return RegistryConfigFile.model_validate(yaml.safe_load(config)).registries

    async def list(self) -> AsyncIterator[Registry]:
        for registry in await self._read_registries():
            yield registry

    async def create(self, *, registry: Registry) -> None:
        registries = [registry async for registry in self.list()]
        if registry not in registries:
            registries.append(registry)
            await self._write_registries(registries)

    async def delete(self, *, registry: Registry) -> None:
        registries = [registry async for registry in self.list() if registry != registry]
        await self._write_registries(registries)
