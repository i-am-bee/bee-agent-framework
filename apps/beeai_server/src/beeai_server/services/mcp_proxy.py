import asyncio
import logging
import uuid
import warnings
from asyncio import CancelledError
from collections import defaultdict
from contextlib import AsyncExitStack, suppress, asynccontextmanager
from contextvars import ContextVar
from datetime import timedelta
from enum import StrEnum
from functools import cached_property
from typing import Final, Callable, Coroutine

import anyio
from anyio.abc import TaskGroup
from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream
from kink import inject

from beeai_server.adapters.interface import IProviderRepository
from beeai_server.domain.model import Provider
from beeai_server.domain.services import get_provider_connection
from beeai_server.utils.periodic import Periodic
from mcp import ClientSession, Tool, ServerNotification, ProgressNotification, ServerRequest
from mcp import ServerSession, types
from mcp.server import Server
from mcp.server.models import InitializationOptions
from mcp.shared.context import RequestContext
from mcp.shared.session import RequestResponder, ReceiveResultT, ReceiveRequestT, SendResultT, ReceiveNotificationT
from mcp.types import (
    AgentTemplate,
    Resource,
    Prompt,
    CallToolRequestParams,
    ClientRequest,
    CallToolRequest,
    CallToolResult,
    RequestParams,
    RunAgentRequestParams,
    RunAgentRequest,
)

logger = logging.getLogger(__name__)

mcp_session_context = ContextVar("mcp_session_context")


class LoadedProvider:
    RECONNECT_INTERVAL = timedelta(seconds=10)
    PING_TIMEOUT = timedelta(seconds=5)
    session: ClientSession | None = None
    incoming_messages: MemoryObjectReceiveStream[
        RequestResponder[ReceiveRequestT, SendResultT] | ReceiveNotificationT | Exception
    ]
    provider: Provider
    agent_templates: list[AgentTemplate] = []
    tools: list[Tool] = []
    resources: list[Resource] = []
    prompts: list[Prompt] = []

    def __init__(self, provider: Provider):
        self.provider = provider
        self._open = False
        self._ensure_session_periodic = Periodic(
            executor=self._ensure_session,
            period=self.RECONNECT_INTERVAL,
            name=f"Ensure session for provider: {provider}",
        )
        self._session_exit_stack = AsyncExitStack()
        self._writers_exit_stack = AsyncExitStack()
        self._write_messages, self.incoming_messages = anyio.create_memory_object_stream()
        self._stopping = False
        self._stopped = asyncio.Event()
        self._supports_agents = True

    async def init(self):
        return await self.__aenter__()

    async def close(self):
        return await self.__aexit__(None, None, None)

    async def load_features(self, capabilities):
        # TODO: Use low lever requests - pagination not implemented in mcp client?
        # TODO: server exceptions - unknown requests such as
        with anyio.fail_after(10):
            if capabilities.agents:
                self.agent_templates = (await self.session.list_agent_templates()).agentTemplates
                logger.info(f"Loaded {len(self.agent_templates)} agent templates")
            with suppress(Exception):  # TODO what exception
                self.tools = (await self.session.list_tools()).tools
                logger.info(f"Loaded {len(self.tools)} tools")
            with suppress(Exception):  # TODO what exception
                self.resources = (await self.session.list_resources()).resources
                logger.info(f"Loaded {len(self.resources)} resources")
            with suppress(Exception):  # TODO what exception
                self.prompts = (await self.session.list_prompts()).resources
                logger.info(f"Loaded {len(self.prompts)} prompts")

    async def _pipe_messages(self):
        async for message in self.session.incoming_messages:
            await self._write_messages.send(message)

    async def _initialize_session(self):
        with suppress(Exception):
            await self._session_exit_stack.aclose()
        logger.info(f"Initializing session to provider {self.provider}")
        connection = await get_provider_connection(self.provider)
        read_stream, write_stream = await self._session_exit_stack.enter_async_context(connection.mcp_client())
        session = await self._session_exit_stack.enter_async_context(ClientSession(read_stream, write_stream))
        initialize_result = await session.initialize()
        tg = await self._session_exit_stack.enter_async_context(anyio.create_task_group())
        tg.start_soon(self._pipe_messages)
        self._session_exit_stack.callback(lambda: tg.cancel_scope.cancel())
        self.session = session
        await self.load_features(initialize_result.capabilities)

    async def _ensure_session(self):
        if self._stopping:
            await self._session_exit_stack.aclose()
            self._stopped.set()
            return
        try:
            if self.session:
                with anyio.fail_after(self.PING_TIMEOUT.total_seconds()):
                    await self.session.send_ping()
                return
            await self._initialize_session()
        except TimeoutError:
            logger.warning(f"The server did not respond in {self.PING_TIMEOUT}, we assume it is processing a request")
        except Exception as ex:  # TODO narrow exception scope
            logger.warning(f"Connection to {self.provider} was closed, reconnecting in {self.RECONNECT_INTERVAL}: {ex}")
            self.session = None

    async def __aenter__(self):
        self._stopping = False
        logger.info(f"Loading provider {self.provider}")
        await self._writers_exit_stack.enter_async_context(self._write_messages)
        await self._ensure_session_periodic.start()

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._writers_exit_stack.aclose()
        self._stopping = True
        self._ensure_session_periodic.poke()
        await self._stopped.wait()
        await self._ensure_session_periodic.stop()
        logger.info(f"Removing provider {self.provider}")


class NotificationStreamType(StrEnum):
    BROADCAST = "broadcast"
    """Forward notifications from all providers except those that are private: [ProgressNotification]"""

    PROGRESS = "progress"
    """Forward progress notifications which belong to this request"""


class NotificationHub:
    _notification_stream_reader: MemoryObjectReceiveStream[ServerNotification]
    _notification_stream_writer: MemoryObjectSendStream[ServerNotification]
    _notification_pipe: TaskGroup

    def __init__(self):
        self._exit_stack = AsyncExitStack()
        self._notification_subscribers: set[Callable[[ServerNotification], Coroutine]] = set()
        self._notification_stream_writer, self._notification_stream_reader = anyio.create_memory_object_stream[
            ServerNotification
        ]()
        self._provider_cleanups: dict[Provider, Callable[[], None]] = defaultdict(lambda: lambda: None)

    async def register(self, provider: LoadedProvider):
        self._notification_pipe.start_soon(self._subscribe_for_messages, provider)
        logger.info(f"Started listening for notifications from: {provider.provider}")

    async def remove(self, provider: LoadedProvider):
        self._provider_cleanups[provider.provider]()
        logger.info(f"Stopped listening for notifications from: {provider.provider}")

    @asynccontextmanager
    async def forward_notifications(
        self,
        session: ServerSession,
        streams=NotificationStreamType.BROADCAST,
        request_context: RequestContext | None = None,
    ):
        if streams == NotificationStreamType.PROGRESS and not request_context:
            raise ValueError(f"Missing request context for {NotificationStreamType.PROGRESS} notifications")

        async def forward_notification(notification: ServerNotification):
            try:
                match streams:
                    case NotificationStreamType.PROGRESS:
                        if not isinstance(notification, ProgressNotification):
                            return
                        if not (request_context.meta and request_context.meta.progressToken):
                            logger.warning("Could not dispatch progress notification, missing progress Token")
                            return
                        notification.model_extra.pop("jsonrpc", None)
                        await session.send_notification(notification)

                    case NotificationStreamType.BROADCAST:
                        if isinstance(notification, ProgressNotification):
                            return
                        notification.model_extra.pop("jsonrpc", None)
                        await session.send_notification(notification)
            except anyio.BrokenResourceError:
                # TODO why the resource broken - need proper cleanup?
                self._notification_subscribers.remove(forward_notification)

        try:
            self._notification_subscribers.add(forward_notification)
            yield
        finally:
            self._notification_subscribers.remove(forward_notification)

    async def _forward_notifications_loop(self):
        async for message in self._notification_stream_reader:
            for forward_message_handler in self._notification_subscribers.copy():
                try:
                    await forward_message_handler(message)
                except Exception as e:
                    logger.warning(f"Failed to forward notification: {e}", exc_info=e)

    async def _subscribe_for_messages(self, provider: LoadedProvider):
        async def subscribe():
            try:
                async for message in provider.incoming_messages:
                    match message:
                        case ServerNotification(root=notify):
                            logger.debug(f"Dispatching notification {notify.method}")
                            await self._notification_stream_writer.send(notify)
            except (anyio.BrokenResourceError, anyio.EndOfStream, CancelledError) as ex:
                logger.error(f"Exception occured during reading messages: {ex}")

        with suppress(CancelledError):
            async with anyio.create_task_group() as tg:
                tg.start_soon(subscribe)
        self._provider_cleanups[provider.provider] = lambda: tg.cancel_scope.cancel()

    async def __aenter__(self):
        self._notification_pipe = await self._exit_stack.enter_async_context(anyio.create_task_group())
        await self._exit_stack.enter_async_context(self._notification_stream_writer)
        await self._exit_stack.enter_async_context(self._notification_stream_reader)
        self._notification_pipe.start_soon(self._forward_notifications_loop)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._exit_stack.aclose()


class MCPClientContainer:
    RELOAD_PERIOD: Final = timedelta(minutes=1)

    def __init__(self, repository: IProviderRepository):
        self._periodic_reload: Periodic = Periodic(
            executor=self._reload,
            period=self.RELOAD_PERIOD,
            name="reload providers",
        )
        self.loaded_providers: list[LoadedProvider] = []
        self._repository = repository

        # Cleanup
        self._stopping = False
        self._stopped = asyncio.Event()
        self._exit_stack = AsyncExitStack()

        self._notification_hub = NotificationHub()

    @property
    def tools(self) -> list[Tool]:
        return [tool for p in self.loaded_providers for tool in p.tools]

    @property
    def agent_templates(self) -> list[AgentTemplate]:
        return [template for p in self.loaded_providers for template in p.agent_templates]

    @property
    def resources(self) -> list[Resource]:
        return [resource for p in self.loaded_providers for resource in p.resources]

    @property
    def prompts(self) -> list[Prompt]:
        return [prompt for p in self.loaded_providers for prompt in p.prompts]

    @property
    def routing_table(self) -> dict[str, LoadedProvider]:
        return {
            **{f"tool/{tool.name}": p for p in self.loaded_providers for tool in p.tools},
            **{f"prompt/{prompt.name}": p for p in self.loaded_providers for prompt in p.prompts},
            **{f"resource/{resource.uri}": p for p in self.loaded_providers for resource in p.resources},
            **{f"agent/{templ.name}": p for p in self.loaded_providers for templ in p.agent_templates},
        }

    def forward_notifications(
        self,
        session: ServerSession,
        streams=NotificationStreamType.BROADCAST,
        request_context: RequestContext | None = None,
    ):
        return self._notification_hub.forward_notifications(
            session=session, streams=streams, request_context=request_context
        )

    async def _reload(self):
        """
        Handle updates to providers repository.

        This function must enters various anyio CancelScopes internally. Hence all operations must be called from
        the same asyncio task to prevent stack corruption, for example by handling all operations through
        Periodic:
        https://anyio.readthedocs.io/en/stable/cancellation.html#avoiding-cancel-scope-stack-corruption
        """
        if self._stopping:
            for provider in self.loaded_providers:
                await provider.close()
            self.loaded_providers = []
            self._stopped.set()
            return

        logger.info("Loading MCP providers.")
        repository_providers = {provider async for provider in self._repository.list()}

        added_providers = repository_providers - {p.provider for p in self.loaded_providers}
        added_providers = [LoadedProvider(p) for p in added_providers]
        removed_providers = [p for p in self.loaded_providers if p.provider not in repository_providers]
        unaffected_providers = [p for p in self.loaded_providers if p.provider in repository_providers]

        logger.info(f"Removing {len(removed_providers)} old providers")
        logger.info(f"Discovered {len(added_providers)} new providers")

        for provider in removed_providers:
            await provider.close()
            await self._notification_hub.remove(provider)
        for provider in added_providers:
            await provider.init()
            await self._notification_hub.register(provider)
        self.loaded_providers = unaffected_providers + added_providers

    def _handle_providers_change(self, _event):
        self._periodic_reload.poke()

    async def __aenter__(self):
        self._stopping = False
        self._stopped.clear()
        await self._exit_stack.enter_async_context(self._notification_hub)
        await self._exit_stack.enter_async_context(self._periodic_reload)
        self._repository.subscribe(handler=self._handle_providers_change)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._repository.unsubscribe(handler=self._handle_providers_change)
        self._stopping = True
        self._periodic_reload.poke()
        await self._stopped.wait()
        await self._exit_stack.aclose()


@inject
class MCPProxyServer:
    def __init__(self, provider_repository: IProviderRepository):
        self._client_container = MCPClientContainer(provider_repository)
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
                async with self._client_container._notification_hub.forward_notifications(session):
                    async for message in session.incoming_messages:
                        logger.debug(f"Received message: {message}")

                        match message:
                            case RequestResponder(request=types.ClientRequest(root=req)):
                                await self.app._handle_request(message, req, session, raise_exceptions)
                            case types.ClientNotification(root=notify):
                                await self.app._handle_notification(notify)

                        for warning in w:
                            logger.info(f"Warning: {warning.category.__name__}: {warning.message}")
