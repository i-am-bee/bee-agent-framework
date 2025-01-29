from kink import di

from beeai_api.adapters.filesystem import FilesystemRegistryRepository
from beeai_api.adapters.interface import IRegistryRepository
from beeai_api.configuration import Configuration, get_configuration
from mcp.server.sse import SseServerTransport


def bootstrap_dependencies():
    di.clear_cache()
    di._aliases.clear()  # reset aliases
    di[Configuration] = get_configuration()
    di[IRegistryRepository] = FilesystemRegistryRepository(registry_path=di[Configuration].registry_path)
    di[SseServerTransport] = SseServerTransport("/mcp/messages/")  # global SSE transport
