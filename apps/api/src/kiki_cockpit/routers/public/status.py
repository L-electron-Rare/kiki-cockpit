"""Public read-only status + router-stats endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from kiki_cockpit.config import settings
from kiki_cockpit.models.status import RouterStats, StatusReport
from kiki_cockpit.services.gateway_probe import (
    fetch_router_stats,
    fetch_workers_status,
)

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/status", response_model=StatusReport)
async def get_status() -> StatusReport:
    workers = await fetch_workers_status(settings.eu_kiki_gateway_url)
    healthy = sum(1 for w in workers if w.healthy)
    return StatusReport(
        workers=workers,
        healthy_count=healthy,
        total_count=len(workers),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/router-stats", response_model=RouterStats)
async def get_router_stats() -> RouterStats:
    return await fetch_router_stats(settings.eu_kiki_gateway_url)
