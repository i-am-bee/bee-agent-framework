from kink import inject

from beeai_api.adapters.interface import IProviderRepository
from beeai_api.configuration import Configuration
from beeai_api.domain.model import Provider


@inject
class ProviderService:
    def __init__(self, config: Configuration, provider_repository: IProviderRepository):
        self._config = config
        self._repository = provider_repository

    async def add_provider(self, provider: Provider):
        return await self._repository.create(provider=provider)

    async def delete_provider(self, provider: Provider):
        return await self._repository.delete(provider=provider)

    async def list_providers(self):
        return [provider async for provider in self._repository.list()]
