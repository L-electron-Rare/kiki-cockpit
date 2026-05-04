"""FastAPI app factory."""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kiki_cockpit.config import settings
from kiki_cockpit.routers.public import health as public_health
from kiki_cockpit.routers.admin import health as admin_health

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("startup", service="kiki-cockpit", port=settings.port)
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="kiki-cockpit",
        version="0.0.0",
        description="Frontend backend for KIKI training/eval/test",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

    app.include_router(public_health.router)
    app.include_router(admin_health.router)

    return app


app = create_app()
