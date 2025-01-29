from typing import Annotated

from beeai_api.services.mcp_proxy import MCPProxyServer
from fastapi import Depends
from kink import di

from beeai_api.services.registry import RegistryService
from mcp.server.sse import SseServerTransport

RegistryServiceDependency = Annotated[RegistryService, Depends(lambda: di[RegistryService])]
SSEServerTransportDependency = Annotated[SseServerTransport, Depends(lambda: di[SseServerTransport])]
MCPProxyServerDependency = Annotated[MCPProxyServer, Depends(lambda: di[MCPProxyServer])]
