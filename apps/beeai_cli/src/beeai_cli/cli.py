import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

import click
import requests
import yaml
from asgiref.sync import async_to_sync

from beeai_cli.configuration import get_configuration
from beeai_cli.utils import parse_key_value_args
from mcp import ClientSession, ClientRequest, CallToolRequest
from mcp.client.sse import sse_client
from mcp.types import CallToolRequestParams, CallToolResult, RequestParams


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


async def call_tool_stream(session: ClientSession, name: str, arguments: dict):
    params = CallToolRequestParams(name=name, arguments=arguments)
    click.echo(f"Calling tool stream: {name}")
    params.meta = RequestParams.Meta(progressToken=uuid.uuid4().hex)
    return await session.send_request(
        ClientRequest(CallToolRequest(method="tools/call", params=params)),
        CallToolResult,
    )


async def _call_tool_impl(tool_name: str, args):
    async with mcp_client() as client:
        await client.initialize()

        task = asyncio.create_task(call_tool_stream(client, tool_name, args))

        # TODO IMPORTANT(!) if the client does not read the notifications, it gets blocked never receiving the response!
        async def read_notifications():
            async for message in client.incoming_messages:
                click.echo(yaml.dump(message.model_dump(mode="json"), indent=2))

        notif_task = asyncio.create_task(read_notifications())

        result = await task
        result = result.model_dump(mode="json")
        click.echo(yaml.dump(result, indent=2))
        click.echo("Done")


@cli.command(name="call")
@click.argument("tool-name")
@click.argument("args", nargs=-1)
def call_tool(tool_name: str, args: tuple):
    args = parse_key_value_args(args)
    asyncio.run(_call_tool_impl(tool_name, args))
