"""FastAPI dependencies."""
from __future__ import annotations

from functools import lru_cache

from fastapi import Request

from ailiance_demo.config import settings
from ailiance_demo.services.hf_cache import HFCache
from ailiance_demo.services.eval_index import EvalIndex
from ailiance_demo.services.datasets import DatasetsService


def get_hf_cache(request: Request) -> HFCache:
    cache = getattr(request.app.state, "hf_cache", None)
    if cache is None:
        raise RuntimeError("HFCache not initialized in app.state")
    return cache


def get_eval_index(request: Request) -> EvalIndex:
    index = getattr(request.app.state, "eval_index", None)
    if index is None:
        raise RuntimeError("EvalIndex not initialized in app.state")
    return index


def get_training_runs_provider(request: Request):
    provider = getattr(request.app.state, "training_runs_provider", None)
    if provider is None:
        raise RuntimeError("training_runs provider not initialized")
    return provider


@lru_cache(maxsize=1)
def get_datasets_service() -> DatasetsService:
    return DatasetsService(roots=settings.datasets_root)
