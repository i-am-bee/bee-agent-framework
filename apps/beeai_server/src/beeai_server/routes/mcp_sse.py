import logging

from kink import inject
from starlette.applications import Starlette

from beeai_server.configuration import Configuration
from beeai_server.services.mcp_proxy import MCPProxyServer
from mcp.server.sse import SseServerTransport

logger = logging.getLogger(__name__)


@inject
def create_sse_app(sse: SseServerTransport, mcp_proxy: MCPProxyServer, config: Configuration) -> Starlette:
    """Run the server using SSE transport (taken directly from MCP SDK)."""
    from starlette.applications import Starlette
    from starlette.routing import Mount, Route

    async def handle_sse(request):
        async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
            await mcp_proxy.run_server(streams[0], streams[1], mcp_proxy.app.create_initialization_options())

    # TODO: cancellation - there is a bug in SSE handling, server cannot be shutdown because of this

    return Starlette(
        debug=config.logging.level == logging.DEBUG,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )


app = create_sse_app()
