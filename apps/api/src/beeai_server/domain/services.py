import tomllib

import aiohttp
from anyio import Path as AsyncPath

from beeai_server.domain.model import (
    Provider,
    ProviderConnection,
    StdioCommand,
    LocalProvider,
    GithubProvider,
)


async def get_local_connection(provider: LocalProvider) -> ProviderConnection:
    path = AsyncPath(provider.path)
    path = await path.resolve()
    if not await path.exists():
        raise ValueError(f"Provider {provider.model_dump()} does not exist")

    if await (path / "pyproject.toml").is_file():
        toml = tomllib.loads(await (path / "pyproject.toml").read_text())
        script = (list(((toml.get("project", {}).get("scripts", None)) or {}).keys()) or [None])[0]  # get first script
        if not script:
            raise ValueError("No script found in pyproject.toml")

        return StdioCommand(command=["uvx", "--from", str(path), script])

    if await (path / "package.json").is_file():
        return StdioCommand(command=["npx", str(path)])
    raise ValueError("Not a compatible provider")


async def get_github_connection(provider: GithubProvider) -> ProviderConnection:
    url = provider.github
    async with aiohttp.ClientSession() as session:
        await session.get(f"{url}/pyproject.toml")
        ...  # todo
    raise ValueError("Not a compatible provider")


async def get_provider_connection(provider: Provider) -> ProviderConnection:
    if isinstance(provider, LocalProvider):
        return await get_local_connection(provider)
    elif isinstance(provider, GithubProvider):
        return await get_github_connection(provider)
    raise NotImplementedError
