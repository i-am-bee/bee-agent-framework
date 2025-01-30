from kink import di

from beeai_api.adapters.filesystem import FilesystemProviderRepository
from beeai_api.adapters.interface import IProviderRepository
from beeai_api.configuration import Configuration, get_configuration
from mcp.server.sse import SseServerTransport


def bootstrap_dependencies():
    di.clear_cache()
    di._aliases.clear()  # reset aliases
    di[Configuration] = get_configuration()
    di[IProviderRepository] = FilesystemProviderRepository(provider_config_path=di[Configuration].provider_config_path)
    di[SseServerTransport] = SseServerTransport("/mcp/messages/")  # global SSE transport
