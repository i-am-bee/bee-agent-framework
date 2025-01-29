from contextlib import asynccontextmanager
from pathlib import Path
from typing import Union

from pydantic import BaseModel, AnyUrl, Field

from mcp import stdio_client, StdioServerParameters
from mcp.client.sse import sse_client


class GithubRegistry(BaseModel):
    github: AnyUrl


class LocalRegistry(BaseModel):
    path: Path


Registry = Union[GithubRegistry, LocalRegistry]


# Connection to agent server


class StdioCommand(BaseModel):
    """Spawn server locally as a subprocess"""

    command: list[str]
    env: dict[str, str] = Field(default_factory=dict)

    @asynccontextmanager
    async def mcp_client(self):
        async with stdio_client(StdioServerParameters(command=self.command[0], args=self.command[1:])) as client:
            yield client


class SSEServer(BaseModel):
    """Connect to a remote server"""

    url: AnyUrl

    @asynccontextmanager
    def mcp_client(self):
        with sse_client(self.url) as client:
            yield client


ProviderConnection = Union[StdioCommand, SSEServer]
