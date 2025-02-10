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
from mcp import (
    ClientSession,
    CreateAgentRequest,
    CreateAgentResult,
    RunAgentResult,
    ListAgentsResult,
    ListAgentTemplatesResult,
)
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
    RunAgentRequest,
    Request,
    DestroyAgentRequest,
    DestroyAgentResult,
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
        request: Request,
        result_type: type[ReceiveResultT],
        forward_progress_notifications=True,
    ):
        request.model_extra.clear()
        if forward_progress_notifications:
            async with self._forward_progress_notifications(server):
                request.params.meta = server.request_context.meta or RequestParams.Meta()
                request.params.meta.progressToken = request.params.meta.progressToken or uuid.uuid4().hex
                resp = await client_session.send_request(ClientRequest(request), result_type)
        else:
            request = request.model_dump(exclude={"jsonrpc"})
            resp = await client_session.send_request(ClientRequest(request), result_type)
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
        async def list_agent_templates(_req):
            return ListAgentTemplatesResult(agentTemplates=self._client_container.agent_templates)

        @server.list_agents()
        async def list_agents(_req):
            return ListAgentsResult(agents=self._client_container.agents)

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

        @server.create_agent()
        async def create_agent(req: CreateAgentRequest) -> CreateAgentResult:
            provider = self._client_container.routing_table[f"agent_template/{req.params.templateName}"]
            return await self._send_request_with_token(provider.session, server, req, CreateAgentResult)

        @server.run_agent()
        async def run_agent(req: RunAgentRequest) -> RunAgentResult:
            provider = self._client_container.routing_table[f"agent/{req.params.name}"]
            return await self._send_request_with_token(provider.session, server, req, RunAgentResult)

        @server.destroy_agent()
        async def destroy_agent(req: DestroyAgentRequest) -> DestroyAgentResult:
            provider = self._client_container.routing_table[f"agent/{req.params.name}"]
            return await self._send_request_with_token(provider.session, server, req, DestroyAgentResult)

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
                            case RequestResponder(request=types.ClientRequest(root=req)) as responder:
                                with responder:
                                    await self.app._handle_request(message, req, session, raise_exceptions)
                            case types.ClientNotification(root=notify):
                                await self.app._handle_notification(notify)

                        for warning in w:
                            logger.info(f"Warning: {warning.category.__name__}: {warning.message}")
