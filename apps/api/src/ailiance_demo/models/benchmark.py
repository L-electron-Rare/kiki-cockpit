"""Pydantic schema for a single benchmark run row."""
from __future__ import annotations

from pydantic import BaseModel


class BenchmarkRun(BaseModel):
    run_id: str
    benchmark: str
    model: str
    adapter: str
    score: float
    score_unit: str
    delta_vs_base: float
    n_samples: int
    date: str
    host: str
    verdict: str
    notes: str
