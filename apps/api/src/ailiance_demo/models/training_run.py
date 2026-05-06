"""Pydantic schemas for training runs."""
from datetime import datetime
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class TrainingRunStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    UNKNOWN = "unknown"


class TrainingMetric(BaseModel):
    iter: int
    split: str  # "train" | "val"
    loss: float
    lr: float | None = None
    took_s: float | None = None


class TrainingRun(BaseModel):
    id: str  # derived from log file basename
    log_path: str
    machine: str  # "studio" | "grosmac" | "kxkm-ai"
    model_name: str | None = None
    status: TrainingRunStatus
    started_at: datetime | None = None
    last_update_at: datetime | None = None
    last_iter: int | None = None
    last_train_loss: float | None = None
    last_val_loss: float | None = None
    config_excerpt: dict = Field(default_factory=dict)


class TrainingRunDetail(TrainingRun):
    metrics: list[TrainingMetric] = Field(default_factory=list)
    raw_lines_tail: list[str] = Field(default_factory=list)
