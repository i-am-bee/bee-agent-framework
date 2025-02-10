import logging
from asyncio import CancelledError
from collections import defaultdict
from contextlib import AsyncExitStack, asynccontextmanager, suppress
from typing import Callable, Coroutine, TYPE_CHECKING

import anyio
from anyio.abc import TaskGroup
from anyio.streams.memory import MemoryObjectReceiveStream, MemoryObjectSendStream
from mcp.types import AgentRunProgressNotification

from beeai_server.domain.model import Provider
from beeai_server.services.mcp_proxy.constants import NotificationStreamType
from mcp import ServerNotification, ServerSession, ProgressNotification
from mcp.shared.context import RequestContext

if TYPE_CHECKING:
    # Prevent circular import
    from beeai_server.services.mcp_proxy.provider import LoadedProvider

logger = logging.getLogger(__name__)


class NotificationHub:
    """
    Manage notifications from multiple providers using observer pattern:
      - aggregate notifications from all providers into a single stream
      - broadcast notifications to subscribers
      - send request-specific notifications to subscribers
    """

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

    async def register(self, provider: "LoadedProvider"):
        self._notification_pipe.start_soon(self._subscribe_for_messages, provider)
        logger.info(f"Started listening for notifications from: {provider.provider}")

    async def remove(self, provider: "LoadedProvider"):
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
                        if not isinstance(notification, (ProgressNotification, AgentRunProgressNotification)):
                            return
                        if not (request_context.meta and request_context.meta.progressToken):
                            logger.warning("Could not dispatch progress notification, missing progress Token")
                            return
                        notification.model_extra.pop("jsonrpc", None)
                        await session.send_notification(notification)

                    case NotificationStreamType.BROADCAST:
                        if isinstance(notification, (ProgressNotification, AgentRunProgressNotification)):
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

    async def _subscribe_for_messages(self, provider: "LoadedProvider"):
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
