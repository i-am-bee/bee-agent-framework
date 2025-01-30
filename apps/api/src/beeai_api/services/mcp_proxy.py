import asyncio
import logging
from contextlib import AsyncExitStack, suppress, asynccontextmanager
from datetime import timedelta
from functools import cached_property
from typing import Final

from kink import inject
from pydantic import AnyUrl

from beeai_api.adapters.interface import IProviderRepository
from beeai_api.domain.model import Provider
from beeai_api.domain.services import get_provider_connection
from beeai_api.utils.periodic import Periodic
from mcp import ClientSession, Tool
from mcp.server import Server
from mcp.types import AgentTemplate, Resource, Prompt

logger = logging.getLogger(__name__)


class LoadedProvider:
    session: ClientSession | None = None
    provider: Provider

    agent_templates: list[AgentTemplate] = []
    tools: list[Tool] = []
    resources: list[Resource] = []
    prompts: list[Prompt] = []

    def __init__(self, provider: Provider):
        self.provider = provider
        self._open = False
        self._exit_stack = AsyncExitStack()

    async def init(self):
        return await self.__aenter__()

    async def close(self):
        return await self.__aexit__(None, None, None)

    async def load_features(self):
        # TODO: Use low lever requests - pagination not implemented in mcp client?
        with suppress(Exception):  # TODO what exception
            self.agent_templates = (await self.session.list_agent_templates()).agentTemplates
        with suppress(Exception):  # TODO what exception
            self.tools = (await self.session.list_tools()).tools
        with suppress(Exception):  # TODO what exception
            self.resources = (await self.session.list_resources()).resources
        with suppress(Exception):  # TODO what exception
            self.prompts = (await self.session.list_prompts()).resources

    @asynccontextmanager
    async def _create_session(self, connection):
        async with connection.mcp_client() as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                yield session

    async def __aenter__(self):
        if not self.session:
            logger.info(f"Loading provider {self.provider}")
            connection = await get_provider_connection(self.provider)

            self.session = await self._exit_stack.enter_async_context(self._create_session(connection))
            await self.session.initialize()
            await self.load_features()
            logger.info(f"Loaded {len(self.agent_templates)} agent templates")
            logger.info(f"Loaded {len(self.tools)} tools")
            logger.info(f"Loaded {len(self.resources)} resources")
            logger.info(f"Loaded {len(self.prompts)} prompts")

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            logger.info(f"Removing provider {self.provider}")
            await self._exit_stack.aclose()


class MCPClientContainer:
    RELOAD_PERIOD: Final = timedelta(minutes=1)

    def __init__(self, repository: IProviderRepository):
        self._periodic_reload: Periodic = Periodic(
            executor=self._reload,
            period=self.RELOAD_PERIOD,
            name="reload providers",
        )
        self._repository = repository
        self.loaded_providers: list[LoadedProvider] = []

        self.provider_by_tool: dict[str, LoadedProvider] = {}
        self.provider_by_resource: dict[AnyUrl, LoadedProvider] = {}
        self.provider_by_agent_template: dict[str, LoadedProvider] = {}
        self.provider_by_prompt: dict[str, LoadedProvider] = {}
        self.all_tools: list[Tool] = []
        self.all_resources: list[Resource] = []
        self.all_agent_templates: list[AgentTemplate] = []
        self.all_prompts: list[Prompt] = []
        self._stopping = False
        self._stopped = asyncio.Event()

    def _recompute_maps(self):
        self.all_tools = [tool for p in self.loaded_providers for tool in p.tools]
        self.all_agent_templates = [template for p in self.loaded_providers for template in p.agent_templates]
        self.all_prompts = [prompt for p in self.loaded_providers for prompt in p.prompts]
        self.all_resources = [resource for p in self.loaded_providers for resource in p.resources]
        self.provider_by_tool = {tool.name: p for p in self.loaded_providers for tool in p.tools}
        self.provider_by_prompt = {prompt.name: p for p in self.loaded_providers for prompt in p.prompts}
        self.provider_by_resource = {resource.uri: p for p in self.loaded_providers for resource in p.resources}
        self.provider_by_agent_template = {templ.name: p for p in self.loaded_providers for templ in p.agent_templates}

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
            self._recompute_maps()
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
        for provider in added_providers:
            await provider.init()

        self.loaded_providers = unaffected_providers + added_providers
        if added_providers or removed_providers:
            self._recompute_maps()

    def _handle_providers_change(self, _event):
        self._periodic_reload.poke()

    async def __aenter__(self):
        self._stopping = False
        self._stopped.clear()
        await self._periodic_reload.start()
        self._repository.subscribe(handler=self._handle_providers_change)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        self._stopping = True
        self._periodic_reload.poke()
        await self._stopped.wait()
        await self._periodic_reload.stop()
        self._repository.unsubscribe(handler=self._handle_providers_change)


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

    @cached_property
    def app(self):
        server = Server(name="beeai-platform-server", version="1.0.0")

        @server.list_tools()
        async def list_tools():
            return self._client_container.all_tools

        @server.list_resources()
        async def list_resources():
            return self._client_container.all_resources

        @server.list_prompts()
        async def list_prompts():
            return self._client_container.all_prompts

        # TODO
        # @server.list_agent_templates()
        # async def list_agent_templates():
        #     return self._client_container.all_agent_templates

        @server.call_tool()
        async def call_tool(name: str, arguments: dict | None = None):
            provider = self._client_container.provider_by_tool[name]
            resp = await provider.session.call_tool(name, arguments)
            if resp.isError:
                raise Exception(str(resp.content[0].text))
            return resp.content

        return server
