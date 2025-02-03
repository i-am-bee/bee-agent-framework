from beeai_cli.async_typer import AsyncTyper
import beeai_cli.commands.tool

app = AsyncTyper()
app.add_typer(beeai_cli.commands.tool.app, name="tool")

if __name__ == "__main__":
    app()
