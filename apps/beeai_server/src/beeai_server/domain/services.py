import re

import anyio

from beeai_server.domain.model import (
    Provider,
    ProviderConnection,
    StdioCommand,
    UvxProvider,
    RemoteMcpProvider,
    SSEServer,
)


async def get_local_connection(provider: UvxProvider) -> ProviderConnection:
    if not (executable_command := provider.executable_command):
        resp = await anyio.run_process(
            ["uvx", "--from", str(provider.location), "_nonexistent_command"],
            check=False,
        )
        pattern = r'provided by [`"].*?[`"]:\n-\s*([\w-]+)'
        stdout = resp.stdout.decode("utf-8")
        match = re.search(pattern, stdout)
        if not match:
            raise ValueError(f"Unable to register provider, {stdout}")
        executable_command = match.group(1)

        return StdioCommand(command=["uvx", "--from", str(provider.location), executable_command])
    raise ValueError("Not a compatible provider")


async def get_sse_connection(provider: RemoteMcpProvider):
    return SSEServer(url=provider.location)


async def get_provider_connection(provider: Provider) -> ProviderConnection:
    if isinstance(provider, UvxProvider):
        return await get_local_connection(provider)
    elif isinstance(provider, RemoteMcpProvider):
        return await get_sse_connection(provider)
    raise NotImplementedError
