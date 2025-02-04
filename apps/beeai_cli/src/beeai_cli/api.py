import urllib
import urllib.parse
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import anyio
import httpx

from beeai_cli.configuration import Configuration
from mcp import ClientSession, types
from mcp.client.sse import sse_client
from mcp.shared.session import ReceiveResultT
from mcp.types import RequestParams

BASE_URL = str(Configuration().host)


@asynccontextmanager
async def mcp_client() -> AsyncGenerator[ClientSession, None]:
    """Context manager for MCP client connection."""
    async with sse_client(url=urllib.parse.urljoin(BASE_URL, "mcp/sse")) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


async def request(method: str, path: str, json: dict | None = None) -> dict | None:
    """Make an API request to the server."""
    async with httpx.AsyncClient() as client:
        response = await client.request(method, urllib.parse.urljoin(BASE_URL, path), json=json)
        response.raise_for_status()
        if response.content:
            return response.json()


async def send_request_with_notifications(req: types.Request, result_type: type[ReceiveResultT]):
    resp: ReceiveResultT | None = None
    async with mcp_client() as session:
        await session.initialize()

        message_writer, message_reader = anyio.create_memory_object_stream()

        req = types.ClientRequest(req).root
        req.params = req.params or RequestParams()
        req.params.meta = RequestParams.Meta(progressToken=uuid.uuid4().hex)
        req = types.ClientRequest(req)

        async with anyio.create_task_group() as task_group:

            async def request_task():
                nonlocal resp
                try:
                    resp = await session.send_request(req, result_type)
                finally:
                    task_group.cancel_scope.cancel()

            async def read_notifications():
                # IMPORTANT(!) if the client does not read the notifications, it gets blocked never receiving the response
                async for message in session.incoming_messages:
                    await message_writer.send(message)

            notif_task = task_group.start_soon(read_notifications)
            request_task = task_group.start_soon(request_task)

            async for message in message_reader:
                yield message
    if resp:
        yield resp


async def send_request(req: types.Request, result_type: type[ReceiveResultT]) -> ReceiveResultT:
    async for message in send_request_with_notifications(req, result_type):
        if isinstance(message, result_type):
            return message
    raise RuntimeError(f"No response of type {result_type.__name__} was returned")
