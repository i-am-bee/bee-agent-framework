import logging
from typing import TYPE_CHECKING

from kink import di

if TYPE_CHECKING:
    from fastapi import FastAPI

# configure logging before importing anything
from beeai_server.logging_config import configure_logging

configure_logging()
logger = logging.getLogger(__name__)


def register_exception_handlers(app):
    from fastapi import HTTPException
    from fastapi.exception_handlers import http_exception_handler
    from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

    @app.exception_handler(Exception)
    async def custom_http_exception_handler(request, exc):
        """Include detail in all unhandled exceptions.

        This is not the beset security practice as it can reveal details about the internal workings of this service,
        but this is an open-source service anyway, so the risk is acceptable
        """
        return await http_exception_handler(
            request, HTTPException(status_code=HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))
        )


def mount_routes(app):
    from beeai_server.routes.mcp_sse import app as mcp_app
    from beeai_server.routes.provider import router as provider_router

    app.include_router(router=provider_router, prefix="/provider")
    app.mount("/mcp", mcp_app)
    app.mount("/health", lambda: "OK")


def app() -> "FastAPI":
    """Entrypoint for API application, called by Uvicorn"""
    from fastapi import FastAPI
    from fastapi.responses import ORJSONResponse

    from beeai_server.services.mcp_proxy.proxy_server import MCPProxyServer
    from beeai_server.bootstrap import bootstrap_dependencies

    logger.info("Bootstrapping dependencies...")
    bootstrap_dependencies()

    app = FastAPI(
        lifespan=lambda _: di[MCPProxyServer],
        default_response_class=ORJSONResponse,  # better performance then default + handle NaN floats
    )

    logger.info("Mounting routes...")
    mount_routes(app)

    register_exception_handlers(app)
    return app
