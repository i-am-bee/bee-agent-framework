from enum import StrEnum
from pathlib import Path

import typer
import yaml

from beeai_cli.async_typer import AsyncTyper
from beeai_cli.api import request


app = AsyncTyper()


class ProviderType(StrEnum):
    uvx = "uvx"
    mcp = "mcp"


def _get_abs_location(location: str) -> str:
    if location.startswith("file://"):
        location_abs = Path(location.replace("file://", "")).resolve()
        location = f"file://{location_abs}"
    return location

@app.command("add")
async def add(
    type: ProviderType = typer.Argument(help="Provider type"),
    location: str = typer.Argument(..., help="URL of the provider (file://..., mcp://..., github://..."),
    executable_command: str | None = typer.Option(None, help="Name of the executable command"),
) -> None:
    """Call a tool with given input."""
    location = _get_abs_location(location)
    print(location)
    match type:
        case "mcp":
            await request("post", "provider", json={"type": type, "location": location})
        case "uvx":
            await request(
                "post",
                "provider",
                json={
                    "type": type,
                    "location": location,
                    "executable_command": executable_command,
                },
            )
    typer.echo(f"Added provider: {type}+{location}")


@app.command("list")
async def list():
    resp = await request("get", "provider")
    typer.echo(yaml.dump(resp))


@app.command("remove")
async def remove(
    type: ProviderType = typer.Argument(help="Provider type"),
    location: str = typer.Argument(..., help="URL of the provider (file://..., mcp://..., github://..."),
    executable_command: str | None = typer.Option(None, help="Name of the executable command"),
) -> None:
    """Call a tool with given input."""
    location = _get_abs_location(location)
    match type:
        case "mcp":
            await request("post", "provider/delete", json={"type": type, "location": location})
        case "uvx":
            await request(
                "post",
                "provider/delete",
                json={
                    "type": type,
                    "location": location,
                    "executable_command": executable_command,
                },
            )
    typer.echo(f"Removed provider: {type}+{location}")
