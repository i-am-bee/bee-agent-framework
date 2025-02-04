from contextlib import asynccontextmanager
from typing import Union, Literal

from pydantic import BaseModel, AnyUrl, Field, ConfigDict

from mcp import stdio_client, StdioServerParameters
from mcp.client.sse import sse_client


class UvxProvider(BaseModel):
    type: Literal["uvx"] = "uvx"
    location: AnyUrl
    executable_command: str | None = None
    model_config = ConfigDict(frozen=True)


class RemoteMcpProvider(BaseModel):
    model_config = ConfigDict(frozen=True)
    type: Literal["mcp"] = "mcp"
    location: AnyUrl


Provider = Union[UvxProvider, RemoteMcpProvider]


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
    async def mcp_client(self):
        async with sse_client(str(self.url)) as client:
            yield client


ProviderConnection = Union[StdioCommand, SSEServer]
