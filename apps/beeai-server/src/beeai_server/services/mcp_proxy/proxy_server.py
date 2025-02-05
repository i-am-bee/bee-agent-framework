import logging
import uuid
import warnings
from contextlib import AsyncExitStack, asynccontextmanager
from functools import cached_property

from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream
from kink import inject

from beeai_server.adapters.interface import IProviderRepository
from beeai_server.services.mcp_proxy.provider import ProviderContainer
from beeai_server.services.mcp_proxy.constants import NotificationStreamType
from mcp import ClientSession, ServerRequest
from mcp import ServerSession, types
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.shared.session import RequestResponder, ReceiveResultT
from mcp.types import (
    CallToolRequestParams,
    ClientRequest,
    CallToolRequest,
    CallToolResult,
    RequestParams,
    RunAgentRequestParams,
    RunAgentRequest,
)

logger = logging.getLogger(__name__)


@inject
class MCPProxyServer:
    def __init__(self, provider_repository: IProviderRepository):
        self._client_container = ProviderContainer(provider_repository)
        self._exit_stack = AsyncExitStack()

    async def __aenter__(self):
        logger.info("Loading MCP proxy server")
        await self._exit_stack.enter_async_context(self._client_container)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        logger.info("Shutting down MCP proxy server")
        await self._exit_stack.aclose()

    @asynccontextmanager
    async def _forward_progress_notifications(self, server):
        async with self._client_container.forward_notifications(
            session=server.request_context.session,
            streams=NotificationStreamType.PROGRESS,
            request_context=server.request_context,
        ) as notifications:
            yield notifications

    async def _send_request_with_token(
        self,
        client_session: ClientSession,
        server: Server,
        request: ServerRequest,
        result_type: type[ReceiveResultT],
        forward_progress_notifications=True,
    ):
        if forward_progress_notifications:
            async with self._forward_progress_notifications(server):
                request.params.meta = server.request_context.meta or RequestParams.Meta()
                request.params.meta.progressToken = request.params.meta.progressToken or uuid.uuid4().hex
                resp = await client_session.send_request(ClientRequest(request), result_type)
        else:
            resp = await client_session.send_request(ClientRequest(request), result_type)

        if resp.isError:
            raise Exception(str(resp.content[0].text))
        return resp

    @cached_property
    def app(self):
        server = Server(name="beeai-platform-server", version="1.0.0")

        @server.list_tools()
        async def list_tools():
            return self._client_container.tools

        @server.list_resources()
        async def list_resources():
            return self._client_container.resources

        @server.list_prompts()
        async def list_prompts():
            return self._client_container.prompts

        @server.list_agent_templates()
        async def list_agent_templates():
            return self._client_container.agent_templates

        @server.call_tool()
        async def call_tool(name: str, arguments: dict | None = None):
            provider = self._client_container.routing_table[f"tool/{name}"]
            resp = await self._send_request_with_token(
                provider.session,
                server,
                CallToolRequest(method="tools/call", params=CallToolRequestParams(name=name, arguments=arguments)),
                CallToolResult,
            )
            return resp.content

        @server.run_agent()
        async def run_agent(name: str, config: dict, prompt: str):
            provider = self._client_container.routing_table[f"agent/{name}"]
            resp = await self._send_request_with_token(
                provider.session,
                server,
                RunAgentRequest(
                    method="agents/run", params=RunAgentRequestParams(name=name, prompt=prompt, config=config)
                ),
                CallToolResult,
            )
            return resp.content

        return server

    async def run_server(
        self,
        read_stream: MemoryObjectReceiveStream[types.JSONRPCMessage | Exception],
        write_stream: MemoryObjectSendStream[types.JSONRPCMessage],
        initialization_options: InitializationOptions,
        raise_exceptions: bool = True,
    ):
        """
        HACK: Modified server.run method that subscribes and forwards messages
        The default method sets Request ContextVar only for client requests, not notifications.
        """
        with warnings.catch_warnings(record=True) as w:
            async with ServerSession(read_stream, write_stream, initialization_options) as session:
                async with self._client_container.forward_notifications(session):
                    async for message in session.incoming_messages:
                        logger.debug(f"Received message: {message}")

                        match message:
                            case RequestResponder(request=types.ClientRequest(root=req)):
                                await self.app._handle_request(message, req, session, raise_exceptions)
                            case types.ClientNotification(root=notify):
                                await self.app._handle_notification(notify)

                        for warning in w:
                            logger.info(f"Warning: {warning.category.__name__}: {warning.message}")
