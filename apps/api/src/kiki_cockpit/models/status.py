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
