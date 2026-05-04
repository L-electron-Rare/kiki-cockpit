"""FastAPI app factory."""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from kiki_cockpit.config import settings
from kiki_cockpit.routers.admin import health as admin_health
from kiki_cockpit.routers.public import health as public_health
from kiki_cockpit.routers.public import models as public_models
from kiki_cockpit.services.featured import load_featured
from kiki_cockpit.services.hf_cache import HFCache

log = structlog.get_logger()

EU_KIKI_ALIASES: set[str] = {
    "eu-kiki/apertus-70b",
    "eu-kiki/devstral-24b",
    "eu-kiki/eurollm-22b",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("startup", service="kiki-cockpit", port=settings.port)

    featured = load_featured(settings.featured_path)
    cache = HFCache(
        owners=settings.hf_owners,
        eu_kiki_aliases=EU_KIKI_ALIASES,
        featured=featured,
        cache_dir=settings.cache_dir,
    )
    cache.load_disk_cache()
    app.state.hf_cache = cache

    try:
        await cache.refresh()
    except Exception as exc:
        log.warning("hf.initial_refresh_failed", error=str(exc))

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
    app.include_router(public_models.router)
    app.include_router(admin_health.router)

    return app


app = create_app()
