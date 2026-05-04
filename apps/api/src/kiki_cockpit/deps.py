"""FastAPI dependencies."""
from __future__ import annotations

from fastapi import Request

from kiki_cockpit.services.hf_cache import HFCache


def get_hf_cache(request: Request) -> HFCache:
    cache = getattr(request.app.state, "hf_cache", None)
    if cache is None:
        raise RuntimeError("HFCache not initialized in app.state")
    return cache
