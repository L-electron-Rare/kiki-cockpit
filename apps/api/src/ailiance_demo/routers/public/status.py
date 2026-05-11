"""Public read-only status + router-stats endpoints."""
from __future__ import annotations

import statistics
from datetime import datetime, timezone

from fastapi import APIRouter

from ailiance_demo.config import settings
from ailiance_demo.models.status import RouterStats, StatusReport, TelemetryResponse
from ailiance_demo.services.gateway_probe import (
    fetch_router_stats,
    fetch_workers_status,
)

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/status", response_model=StatusReport)
async def get_status() -> StatusReport:
    workers = await fetch_workers_status(settings.ailiance_gateway_url)
    healthy = sum(1 for w in workers if w.healthy)
    return StatusReport(
        workers=workers,
        healthy_count=healthy,
        total_count=len(workers),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/router-stats", response_model=RouterStats)
async def get_router_stats() -> RouterStats:
    return await fetch_router_stats(settings.ailiance_gateway_url)


@router.get("/telemetry", response_model=TelemetryResponse)
async def get_telemetry() -> TelemetryResponse:
    """Aggregate live telemetry for the Topstrip bandeau.

    Derives models_up/total from worker probes, p50/p95 latency from
    the same sample, and requests_per_min from router stats total_requests.

    # TODO: wire to real otel/prom metrics for accurate RPM + p50/p95.
    """
    workers = await fetch_workers_status(settings.ailiance_gateway_url)
    router_stats = await fetch_router_stats(settings.ailiance_gateway_url)

    models_up = sum(1 for w in workers if w.healthy)
    total_models = len(workers)

    if models_up == 0:
        gateway = "down"
    elif models_up < total_models:
        gateway = "degraded"
    else:
        gateway = "ok"

    latencies = [w.latency_ms for w in workers if w.latency_ms is not None]
    latency_p50: float | None = None
    latency_p95: float | None = None
    if latencies:
        sorted_lat = sorted(latencies)
        latency_p50 = round(statistics.median(sorted_lat), 1)
        p95_idx = max(0, int(len(sorted_lat) * 0.95) - 1)
        latency_p95 = round(sorted_lat[p95_idx], 1)

    # RPM: not available from /metrics yet — return null until otel wiring lands
    # TODO: wire to real otel/prom metrics
    requests_per_min: float | None = None
    if router_stats.total_requests > 0:
        # Stub: expose total count as a proxy until we have a rate counter
        requests_per_min = None

    source = "live" if any(w.latency_ms is not None for w in workers) else "mock"

    return TelemetryResponse(
        models_up=models_up,
        total_models=total_models,
        gateway=gateway,
        latency_p50_ms=latency_p50,
        latency_p95_ms=latency_p95,
        requests_per_min=requests_per_min,
        updated_at=datetime.now(timezone.utc).isoformat(),
        source=source,
    )
