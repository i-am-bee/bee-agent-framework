import asyncio
import json
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Final

import anyio
import click
import mcp.types as types
from mcp.server.lowlevel import Server
from mcp.types import TextContent
from smolagents import AgentText, CodeAgent, LiteLLMModel, VisitWebpageTool
from smolagents.memory import MemoryStep

MAX_STEPS: Final = 5
# Basic configuration
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@click.command()
@click.option("--port", default=8000, help="Port to listen on for SSE")
@click.option(
    "--transport",
    type=click.Choice(["stdio", "sse"]),
    default="stdio",
    help="Transport type",
)
def main(port: int, transport: str) -> int:
    app = Server("mcp-website-fetcher")

    @app.list_agent_templates()
    async def list_agent_templates():
        return [
            types.AgentTemplate(
                name="website_summarizer",
                description="Summarizes a website",
                configSchema={"type": "object"},
            )
        ]

    @app.run_agent()
    async def run_agent(
        name: str, _config: dict, prompt: str
    ) -> list[types.TextContent | types.ImageContent | types.EmbeddedResource]:
        if name != "website_summarizer":
            raise ValueError(f"Unknown tool: {name}")

        agent = CodeAgent(
            tools=[VisitWebpageTool()],
            model=LiteLLMModel(model_id="openai/gpt-4o"),
            max_steps=MAX_STEPS,
        )
        session = app.request_context.session
        progress_token = app.request_context.meta.progressToken or uuid.uuid4().hex
        loop = asyncio.get_event_loop()

        async def send_progress(step_no: int, text: str):
            await session.send_notification(
                types.ServerNotification(
                    types.ProgressNotification(
                        method="notifications/progress",
                        params=types.ProgressNotificationParams(
                            progressToken=progress_token,
                            progress=step_no / MAX_STEPS,
                            total=1.0,
                            text=text,
                        ),
                    )
                )
            )

        tasks = []

        def run_agent():
            nonlocal tasks
            output = []
            for i, step in enumerate(agent.run(task=prompt, stream=True)):
                step: MemoryStep | AgentText
                if isinstance(step, MemoryStep):
                    tasks += [
                        loop.create_task(
                            send_progress(
                                step_no=i, text=json.dumps(step.to_messages())
                            )
                        )
                    ]
                    output.append(step.to_messages())
            tasks += [
                loop.create_task(
                    send_progress(step_no=MAX_STEPS, text=json.dumps(output))
                )
            ]
            return [TextContent(type="text", text=json.dumps(output))]

        result = await loop.run_in_executor(
            ThreadPoolExecutor(max_workers=10), run_agent
        )
        await asyncio.gather(*tasks)
        return result

    if transport == "sse":
        from mcp.server.sse import SseServerTransport
        from starlette.applications import Starlette
        from starlette.routing import Mount, Route

        sse = SseServerTransport("/messages/")

        async def handle_sse(request):
            async with sse.connect_sse(
                request.scope, request.receive, request._send
            ) as streams:
                await app.run(
                    streams[0], streams[1], app.create_initialization_options()
                )

        starlette_app = Starlette(
            debug=True,
            routes=[
                Route("/sse", endpoint=handle_sse),
                Mount("/messages/", app=sse.handle_post_message),
            ],
        )

        import uvicorn

        uvicorn.run(starlette_app, host="0.0.0.0", port=port)
    else:
        from mcp.server.stdio import stdio_server

        async def arun():
            async with stdio_server() as streams:
                await app.run(
                    streams[0], streams[1], app.create_initialization_options()
                )

        anyio.run(arun)

    return 0


if __name__ == "__main__":
    main()
