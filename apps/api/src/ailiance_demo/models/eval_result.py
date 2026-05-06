"""Pydantic schemas for eval results."""
from datetime import datetime

from pydantic import BaseModel, Field


class EvalResult(BaseModel):
    model_id: str
    adapter_id: str | None = None
    benchmark: str
    metric: str
    score: float
    timestamp: datetime
    run_sha: str | None = None
    hardware: str | None = None
    config: dict = Field(default_factory=dict)


class EvalSummary(BaseModel):
    model_id: str
    by_benchmark: dict[str, EvalResult] = Field(
        default_factory=dict,
        description="Latest score per benchmark, keyed by benchmark name",
    )
