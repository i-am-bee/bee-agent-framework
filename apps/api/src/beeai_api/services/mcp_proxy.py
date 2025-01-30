import logging
from contextlib import AsyncExitStack, suppress
from functools import cached_property

from kink import inject

from beeai_api.adapters.interface import IProviderRepository
from beeai_api.domain.services import get_provider_connection
from mcp import types, ClientSession, Tool
from mcp.server import Server
from mcp.types import AgentTemplate


type MCPClient = ClientSession[types.JSONRPCMessage]


logger = logging.getLogger(__name__)


@inject
class MCPProxyServer:
    def __init__(self, provider_repository: IProviderRepository):
        self._providerRepository = provider_repository
        self._exit_stack = AsyncExitStack()
        self._all_clients: list[MCPClient] = []
        self._all_tools: list[Tool] = []
        self._all_agents: list[AgentTemplate] = []
        self._clients_by_agent: dict[str, MCPClient] = {}
        self._clients_by_tool: dict[str, MCPClient] = {}

    async def __aenter__(self):
        logger.info("Initializing MCP proxy.")

        # TODO: subscribe for changes and reload providers - self._provider_repository.subscribe()
        providers = [provider async for provider in self._providerRepository.list()]

        for provider in providers:
            connection = await get_provider_connection(provider)
            client = await self._exit_stack.enter_async_context(connection.mcp_client())
            client = await self._exit_stack.enter_async_context(ClientSession(client[0], client[1]))
            await client.initialize()
            self._all_clients.append(client)
        for client in self._all_clients:
            with suppress(Exception):  # TODO what exception
                tools = await client.list_tools()
                for tool in tools.tools:
                    self._clients_by_tool[tool.name] = client
                    self._all_tools.append(tool)

            with suppress(Exception):  # TODO what exception
                agents = await client.list_agent_templates()
                for agent in agents.agentTemplates:
                    self._clients_by_agent[agent.name] = client
                    self._all_agents.append(agent)
        logger.info(f"Discovered {len(self._all_clients)} providers.")
        logger.info(f"Discovered {len(self._all_agents)} agent templates.")
        logger.info(f"Discovered {len(self._all_tools)} tools.")

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        logger.info("Shutting down MCP proxy.")
        await self._exit_stack.aclose()

    @cached_property
    def app(self):
        server = Server(name="beeai-platform-server", version="1.0.0")

        @server.list_tools()
        async def list_tools():
            return self._all_tools

        @server.call_tool()
        async def call_tool(name: str, arguments: dict | None = None):
            client = self._clients_by_tool[name]
            resp = await client.call_tool(name, arguments)
            if resp.isError:
                raise Exception(str(resp.content[0].text))
            return resp.content

        return server
