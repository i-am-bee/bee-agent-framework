import typer
from mcp import types

from beeai_cli.api import send_request, send_request_with_notifications
from beeai_cli.async_typer import AsyncTyper
from beeai_cli.utils import format_model

app = AsyncTyper()



@app.command("run")
async def run(
    name: str = typer.Argument(help="Name of the tool to call"),
    prompt: str = typer.Argument(help="Agent prompt"),
) -> None:
    """Call a tool with given input."""
    async for message in send_request_with_notifications(
        types.RunAgentRequest(
            method="agents/run", params=types.RunAgentRequestParams(name=name, input=dict(prompt=prompt))
        ),
        types.RunAgentResult,
    ):
        typer.echo(format_model(message))


@app.command("list")
async def list():
    result = await send_request(types.ListAgentsRequest(method="agents/list"), types.ListAgentsResult)
    typer.echo(format_model(result.agents))
