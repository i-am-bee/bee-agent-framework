import json
import typer
from beeai_cli.async_typer import AsyncTyper
from beeai_cli.api import send_request, send_request_with_notifications
from beeai_cli.utils import format_model

from mcp import types

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

    async for message in send_request_with_notifications(
        types.CallToolRequest(
            method="tools/call",
            params=types.CallToolRequestParams(name=name, arguments=parsed_input),
        ),
        types.CallToolResult,
    ):
        typer.echo(format_model(message))


@app.command("list")
async def list():
    result = await send_request(types.ListToolsRequest(method="tools/list"), types.ListToolsResult)
    typer.echo(format_model(result.tools))
