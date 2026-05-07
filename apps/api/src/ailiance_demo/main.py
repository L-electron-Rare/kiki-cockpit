"""FastAPI app factory."""
import asyncio
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from ailiance_demo.config import settings
from ailiance_demo.routers.admin import benchmarks as admin_benchmarks
from ailiance_demo.routers.admin import dataset_flags as admin_dataset_flags
from ailiance_demo.routers.admin import datasets as admin_datasets
from ailiance_demo.routers.admin import eval_browser as admin_eval_browser
from ailiance_demo.routers.admin import health as admin_health
from ailiance_demo.routers.admin import training as admin_training
from ailiance_demo.routers.admin import workers as admin_workers
from ailiance_demo.routers.public import health as public_health
from ailiance_demo.routers.public import models as public_models
from ailiance_demo.routers.public import eval as public_eval
from ailiance_demo.routers.public import chat as public_chat
from ailiance_demo.routers.public import status as public_status
from ailiance_demo.services.featured import load_featured
from ailiance_demo.services.hf_cache import HFCache
from ailiance_demo.services.eval_index import EvalIndex
from ailiance_demo.services.training_runs_provider import TrainingRunsProvider

log = structlog.get_logger()

# Single source of truth — re-exported for the public API; chat_proxy imports the same
# constant. Adding a new live model here automatically makes it chat-eligible.
from ailiance_demo.services.chat_proxy import AILIANCE_ALIASES  # noqa: E402


async def _periodic_refresh(cache: HFCache, interval_seconds: int) -> None:
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await cache.refresh()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("hfcache.periodic_refresh_failed", error=str(exc))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("startup", service="ailiance-llm-workflow", port=settings.port)

    featured = load_featured(settings.featured_path)
    cache = HFCache(
        owners=settings.hf_owners,
        ailiance_aliases=AILIANCE_ALIASES,
        featured=featured,
        cache_dir=settings.cache_dir,
    )
    cache.load_disk_cache()
    app.state.hf_cache = cache

    try:
        await cache.refresh()
    except Exception as exc:
        log.warning("hf.initial_refresh_failed", error=str(exc))

    refresh_task = asyncio.create_task(_periodic_refresh(cache, settings.hf_sync_interval_seconds))

    eval_index = EvalIndex(
        roots=[
            settings.ailiance_root / "eval" / "results",
            settings.ailiance_root / "output" / "eval",
            settings.kiki_mac_tunner_root / "results",
        ],
    )
    eval_index.refresh()
    app.state.eval_index = eval_index

    # Annotate cards with top score
    for card in cache.list_cards():
        top = eval_index.top_score_for(card.id)
        if top is not None:
            card.top_eval_benchmark, card.top_eval_score = top

    runs_provider = TrainingRunsProvider(
        roots=settings.training_log_roots,
        machine_label=settings.machine_label,
    )
    app.state.training_runs_provider = runs_provider

    yield

    refresh_task.cancel()
    try:
        await refresh_task
    except asyncio.CancelledError:
        pass
    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="AILIANCE LLM Workflow",
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

    app.state.limiter = public_chat.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(public_health.router)
    app.include_router(public_models.router)
    app.include_router(public_eval.router)
    app.include_router(public_chat.router)
    app.include_router(public_status.router)
    app.include_router(admin_benchmarks.router)
    app.include_router(admin_datasets.router)
    app.include_router(admin_dataset_flags.router)
    app.include_router(admin_health.router)
    app.include_router(admin_training.router)
    app.include_router(admin_workers.router)
    app.include_router(admin_eval_browser.router)

    return app


app = create_app()
