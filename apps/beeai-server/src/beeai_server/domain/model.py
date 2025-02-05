import re
from contextlib import asynccontextmanager
from typing import Union, Literal

import anyio
from pydantic import BaseModel, AnyUrl, Field, ConfigDict

from mcp import stdio_client, StdioServerParameters
from mcp.client.sse import sse_client


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


# Providers
class UvxProvider(BaseModel):
    type: Literal["uvx"] = "uvx"
    location: AnyUrl
    executable_command: str | None = None
    model_config = ConfigDict(frozen=True)

    async def get_connection(self):
        if not (executable_command := self.executable_command):
            resp = await anyio.run_process(
                ["uvx", "--from", str(self.location), "_nonexistent_command"],
                check=False,
            )
            pattern = r'provided by [`"].*?[`"]:\n-\s*([\w-]+)'
            stdout = resp.stdout.decode("utf-8")
            match = re.search(pattern, stdout)
            if not match:
                raise ValueError(f"Unable to register provider, {stdout}")
            executable_command = match.group(1)

        return StdioCommand(command=["uvx", "--from", str(self.location), executable_command])


class RemoteMcpProvider(BaseModel):
    model_config = ConfigDict(frozen=True)
    type: Literal["mcp"] = "mcp"
    location: AnyUrl

    async def get_connection(self) -> ProviderConnection:
        return SSEServer(url=self.location)


Provider = Union[UvxProvider, RemoteMcpProvider]
