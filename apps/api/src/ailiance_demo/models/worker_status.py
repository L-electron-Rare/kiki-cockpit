"""Pydantic schemas for worker status."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class WorkerHealth(str, Enum):
    OK = "ok"
    WARN = "warn"
    DOWN = "down"


class WorkerStatus(BaseModel):
    name: str
    url: str
    health: WorkerHealth
    latency_ms: float | None = None
    mem_mb: float | None = None
    last_check_at: datetime
    error: str | None = None
