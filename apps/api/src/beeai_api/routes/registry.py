import fastapi

from beeai_api.domain.model import Registry
from beeai_api.routes.dependencies import RegistryServiceDependency
from beeai_api.schema import PaginatedResponse

router = fastapi.APIRouter()


@router.post('')
async def create_registry(registry: Registry, registry_service: RegistryServiceDependency):
    await registry_service.add_registry(registry)
    return fastapi.Response(status_code=fastapi.status.HTTP_201_CREATED)


@router.get('')
async def list_registries(registry_service: RegistryServiceDependency):
    registries = await registry_service.list_registries()
    return PaginatedResponse(items=registries, total_count=len(registries))


@router.post('/delete')
async def delete_registry(registry: Registry, registry_service: RegistryServiceDependency):
    await registry_service.delete_registry(registry)
    return fastapi.Response(status_code=fastapi.status.HTTP_204_NO_CONTENT)
