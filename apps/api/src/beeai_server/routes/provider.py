import fastapi

from beeai_server.domain.model import Provider
from beeai_server.routes.dependencies import ProviderServiceDependency
from beeai_server.schema import PaginatedResponse

router = fastapi.APIRouter()


@router.post("")
async def create_provider(provider: Provider, provider_service: ProviderServiceDependency):
    await provider_service.add_provider(provider)
    return fastapi.Response(status_code=fastapi.status.HTTP_201_CREATED)


@router.get("")
async def list_providers(provider_service: ProviderServiceDependency):
    providers = await provider_service.list_providers()
    return PaginatedResponse(items=providers, total_count=len(providers))


@router.post("/delete")
async def delete_provider(provider: Provider, provider_service: ProviderServiceDependency):
    await provider_service.delete_provider(provider)
    return fastapi.Response(status_code=fastapi.status.HTTP_204_NO_CONTENT)
