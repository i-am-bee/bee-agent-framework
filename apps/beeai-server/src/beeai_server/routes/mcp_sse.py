import logging
from asyncio import CancelledError

import anyio
from anyio.abc import TaskGroup
from fastapi import FastAPI, HTTPException
from kink import inject
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.responses import Response
from starlette.status import HTTP_200_OK, HTTP_503_SERVICE_UNAVAILABLE

from beeai_server.configuration import Configuration
from beeai_server.services.mcp_proxy.proxy_server import MCPProxyServer

logger = logging.getLogger(__name__)


def _listen_for_disconnect(request: Request, task_group: TaskGroup):
    """
    HACK: This is a temporary solution of a memory leak and graceful server shutdown inspired by:
        sse_starlette.sse.EventSourceResponse._listen_for_disconnect

    The reason we need this is, because the connect_sse will never cancel the streams even when the client disconnects.
    The ServerSession is then never released being stuck forever on:
        async for message in session.incoming_messages:
    """

    async def _receive_gen():
        while True:
            yield await request.receive()

    _receive_gen = _receive_gen()

    async def receive():
        message = await anext(_receive_gen)
        if message["type"] == "http.disconnect":
            logger.debug("Session disconnected.")
            task_group.cancel_scope.cancel()
        return message

    return receive


@inject
def create_sse_app(sse: SseServerTransport, mcp_proxy: MCPProxyServer, config: Configuration) -> FastAPI:
    """Run the server using SSE transport (taken directly from MCP SDK)."""
    from starlette.routing import Mount, Route

    async def handle_sse(request: Request):
        try:
            async with anyio.create_task_group() as tg:
                receive = _listen_for_disconnect(request, tg)
                async with sse.connect_sse(request.scope, receive, request._send) as (read_stream, write_stream):
                    await mcp_proxy.run_server(read_stream, write_stream, mcp_proxy.app.create_initialization_options())
        except anyio.BrokenResourceError as ex:
            raise HTTPException(HTTP_503_SERVICE_UNAVAILABLE, "Client disconnected abruptly") from ex
        except (CancelledError, anyio.WouldBlock) as ex:
            raise HTTPException(HTTP_503_SERVICE_UNAVAILABLE, "Task cancelled probably due to server shutdown") from ex
        logger.debug("Client disconnected.")
        return Response(status_code=HTTP_200_OK)

    return FastAPI(
        debug=config.logging.level == logging.DEBUG,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )


app = create_sse_app()
