from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import click
import requests
import yaml
from asgiref.sync import async_to_sync

from beeai_cli.configuration import get_configuration
from beeai_cli.utils import parse_key_value_args
from mcp import ClientSession
from mcp.client.sse import sse_client


@click.group()
def cli():
    pass


@cli.group()
def provider():
    pass


def url(path):
    return str(get_configuration().server_url).rstrip("/") + "/" + path


@asynccontextmanager
async def mcp_client() -> AsyncGenerator[ClientSession]:
    async with sse_client(url=url("mcp/sse")) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            yield session


@provider.command(name="add")
@click.argument("path", type=click.Path(exists=True))
def provider_add(path: str):
    """Add a path to the provider."""
    abs_path = str(Path(path).resolve())
    requests.post(url("provider"), json={"path": abs_path})
    click.echo(f"Added path: {abs_path}")


@provider.command(name="ls")
def provider_list():
    """List all paths in the provider."""
    response = requests.get(url("provider")).json()
    click.echo(yaml.dump(response))


@provider.command(name="remove")
@click.argument("path")
def provider_remove(path: str):
    """Remove a path from the provider."""
    abs_path = str(Path(path).resolve())
    requests.post(url("provider/delete"), json={"path": abs_path})
    click.echo(f"Removed path: {abs_path}")


@cli.command(name="list")
@click.argument("what", type=click.Choice(["tools"]))
@async_to_sync
async def list_items(what: str):
    async with mcp_client() as client:
        client: ClientSession
        await client.initialize()
        tools = await client.list_tools()
        tools = tools.model_dump(mode="json")["tools"]
        click.echo(yaml.dump(tools, indent=2))


@cli.command(name="call")
@click.argument("tool-name")
@click.argument("args", nargs=-1)
@async_to_sync
async def call_tool(tool_name: str, args: tuple):
    args = parse_key_value_args(args)
    async with mcp_client() as client:
        await client.initialize()
        result = await client.call_tool(tool_name, args)
        result = result.model_dump(mode="json")
        click.echo(yaml.dump(result, indent=2))
