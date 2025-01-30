from typing import Annotated

from beeai_api.services.mcp_proxy import MCPProxyServer
from fastapi import Depends
from kink import di

from beeai_api.services.provider import ProviderService
from mcp.server.sse import SseServerTransport

ProviderServiceDependency = Annotated[ProviderService, Depends(lambda: di[ProviderService])]
SSEServerTransportDependency = Annotated[SseServerTransport, Depends(lambda: di[SseServerTransport])]
MCPProxyServerDependency = Annotated[MCPProxyServer, Depends(lambda: di[MCPProxyServer])]
