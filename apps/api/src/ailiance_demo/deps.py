"""FastAPI dependencies."""
from __future__ import annotations

from functools import lru_cache

from fastapi import Request

from ailiance_demo.config import settings
from ailiance_demo.services.hf_cache import HFCache
from ailiance_demo.services.eval_index import EvalIndex
from ailiance_demo.services.benchmarks import BenchmarksService
from ailiance_demo.services.datasets import DatasetsService
from ailiance_demo.services.dataset_flags import DatasetFlagsService


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
def get_benchmarks_service() -> BenchmarksService:
    return BenchmarksService(yaml_path=settings.benchmarks_yaml_path)


@lru_cache(maxsize=1)
def get_datasets_service() -> DatasetsService:
    return DatasetsService(roots=settings.datasets_root)


@lru_cache(maxsize=1)
def get_dataset_flags_service() -> DatasetFlagsService:
    return DatasetFlagsService(flags_dir=settings.dataset_flags_dir)


from ailiance_demo.services.training_launcher import (
    SSHScreenDispatcher,
    TrainingLauncher,
)


@lru_cache(maxsize=1)
def get_training_launcher() -> TrainingLauncher:
    return TrainingLauncher(dispatcher=SSHScreenDispatcher())
