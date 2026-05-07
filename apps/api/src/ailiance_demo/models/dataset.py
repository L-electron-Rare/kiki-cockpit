"""Pydantic schemas for dataset gallery + training designer."""
from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class DatasetSample(BaseModel):
    user: str
    assistant: str


class DatasetSummary(BaseModel):
    domain: str
    name: str
    n_rows: int
    license: str
    hf_dataset_id: str
    download_date: str
    size_bytes: int
    notes: str | None = None

    @computed_field  # type: ignore[misc]
    @property
    def size_mb(self) -> float:
        return round(self.size_bytes / (1024 * 1024), 2)


class DatasetDetail(DatasetSummary):
    samples: list[DatasetSample] = Field(default_factory=list)
