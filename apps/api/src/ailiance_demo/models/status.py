"""Pydantic schemas for the public /status endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class WorkerStatus(BaseModel):
    id: str
    label: str
    host: str
    healthy: bool
    latency_ms: float | None
    model_loaded: bool
    uptime_s: int
    error: str | None = None
    # Hardware metadata (static per worker, declared in WORKERS config)
    gpu: str | None = None
    vram_gb: float | None = None
    tdp_w: int | None = None
    # Derived / live metrics
    load_pct: float | None = None  # gateway-reported utilisation if available
    tokens_today: int | None = None  # tokens served in the last 24h (estimate)
    kwh_per_day: float | None = None  # TDP_W × 24 / 1000 — daily energy estimate
    served_models: list[str] | None = None  # actual models the worker currently serves
    vram_used_mb: int | None = None  # live GPU memory used
    vram_total_mb: int | None = None  # GPU memory total (nvidia-smi)
    temp_c: float | None = None  # GPU temperature


class StatusReport(BaseModel):
    workers: list[WorkerStatus]
    healthy_count: int
    total_count: int
    timestamp: str


class RouterStats(BaseModel):
    cache_hits: int
    cache_misses: int
    total_requests: int
    per_model_requests: dict[str, int] = Field(default_factory=dict)


class TelemetryResponse(BaseModel):
    models_up: int
    total_models: int
    gateway: str  # "ok" | "degraded" | "down"
    latency_p50_ms: float | None
    latency_p95_ms: float | None
    requests_per_min: float | None
    updated_at: str
    source: str  # "live" | "mock"
