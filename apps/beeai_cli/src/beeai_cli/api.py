from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict
import urllib.parse

from beeai_cli.configuration import Configuration
import httpx
from mcp import ClientSession
from mcp.client.sse import sse_client

import urllib

BASE_URL = str(Configuration().host)


@asynccontextmanager
async def mcp_client() -> AsyncGenerator[ClientSession, None]:
    """Context manager for MCP client connection."""
    async with sse_client(url=urllib.parse.urljoin(BASE_URL, "mcp/sse")) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


async def request(method: str, path: str, json: Optional[Dict] = None) -> Dict:
    """Make an API request to the server."""
    async with httpx.AsyncClient() as client:
        response = await client.request(method, urllib.parse.urljoin(BASE_URL, path), json=json)
        response.raise_for_status()
        return response.json()
