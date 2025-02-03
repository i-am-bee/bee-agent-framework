import asyncio
import json
import uuid
from mcp.client.session import ClientSession
import typer
import yaml
from beeai_cli.async_typer import AsyncTyper
from beeai_cli.api import mcp_client

from mcp import ClientRequest, CallToolRequest
from mcp.types import CallToolRequestParams, CallToolResult, RequestParams

app = AsyncTyper()


@app.command("call")
async def run(
    name: str = typer.Argument(help="Name of the tool to call"),
    input: str = typer.Argument(help="Tool input as JSON"),
) -> None:
    """Call a tool with given input."""
    try:
        parsed_input = json.loads(input)
    except json.JSONDecodeError:
        typer.echo("Input must be valid JSON")
        return
    
    async with mcp_client() as client:
        async def call_tool_stream():
            typer.echo(f"Calling tool stream: {name}")
            params = CallToolRequestParams(name=name, arguments=parsed_input)
            params.meta = RequestParams.Meta(progressToken=uuid.uuid4().hex)
            return await client.send_request(
                ClientRequest(CallToolRequest(method="tools/call", params=params)),
                CallToolResult,
            )

        task = asyncio.create_task(call_tool_stream(client, name, parsed_input))

        # TODO IMPORTANT(!) if the client does not read the notifications, it gets blocked never receiving the response!
        async def read_notifications():
            async for message in client.incoming_messages:
                typer.echo(yaml.dump(message.model_dump(mode="json"), indent=2))

        asyncio.create_task(read_notifications())
        result = await task
        result = result.model_dump(mode="json")
        typer.echo(yaml.dump(result, indent=2))
        typer.echo("Done")


@app.command("list")
async def list():
    async with mcp_client() as client:
        client: ClientSession
        tools = await client.list_tools()
        tools = tools.model_dump(mode="json")["tools"]
        typer.echo(yaml.dump(tools, indent=2))
