import yaml
from kink import inject

from beeai_api.adapters.interface import IRegistryRepository
from beeai_api.configuration import Configuration
from beeai_api.domain.model import Registry
from beeai_api.domain.services import get_provider_connection


@inject
class RegistryService:
    def __init__(self, config: Configuration, registry_repository: IRegistryRepository):
        self._config = config
        self._repository = registry_repository

    async def add_registry(self, registry: Registry):
        return await self._repository.create(registry=registry)

    async def delete_registry(self, registry: Registry):
        return await self._repository.delete(registry=registry)

    async def list_registries(self):
        return [registry async for registry in self._repository.list()]
