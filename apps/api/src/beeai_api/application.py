import logging
from contextlib import asynccontextmanager, suppress
from typing import TYPE_CHECKING

from kink import di

if TYPE_CHECKING:
    from fastapi import FastAPI

# configure logging before importing anything
from beeai_api.logging_config import configure_logging, override_uvicorn_logging_config

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


def _include_health_routes(app):
    @app.get("/health")
    def get_health():
        return "OK"


def mount_routes(app):
    from beeai_api.routes.mcp_sse import app as mcp_app
    from beeai_api.routes.provider import router as provider_router

    app.include_router(router=provider_router, prefix="/provider")
    app.mount("/mcp", mcp_app)

    _include_health_routes(app)


def create_fastapi_app(in_script=False) -> "FastAPI":
    """Entrypoint for API application, called by Uvicorn"""
    from fastapi import FastAPI
    from fastapi.responses import ORJSONResponse

    from beeai_api.services.mcp_proxy import MCPProxyServer
    from beeai_api.bootstrap import bootstrap_dependencies

    logger.info("Bootstrapping dependencies...")
    bootstrap_dependencies()

    @asynccontextmanager
    async def lifespan(_app: "FastAPI"):
        if in_script:
            # logging needs to be reconfigured if run as script, because uvicorn overrides handlers on startup
            override_uvicorn_logging_config()

        # Discover MCP servers
        async with di[MCPProxyServer]:
            yield

    # create app
    app = FastAPI(
        lifespan=lifespan,
        default_response_class=ORJSONResponse,  # better performance then default + handle NaN floats
    )

    # mount routes
    logger.info("Mounting routes...")
    mount_routes(app)

    # register exception handlers
    register_exception_handlers(app)
    return app


def main():
    import uvicorn

    with suppress(KeyboardInterrupt):
        uvicorn.run(create_fastapi_app(in_script=True), host="0.0.0.0", port=8333)


if __name__ == "__main__":
    main()
