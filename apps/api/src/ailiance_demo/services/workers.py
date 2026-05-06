"""Ping configured workers and aggregate their health."""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, UTC

import httpx
import structlog

from ailiance_demo.models import WorkerHealth, WorkerStatus

log = structlog.get_logger()


async def ping_worker(
    name: str,
    url: str,
    transport: httpx.BaseTransport | None = None,
    timeout_s: float = 1.0,
) -> WorkerStatus:
    kwargs: dict = {"timeout": timeout_s}
    if transport is not None:
        kwargs["transport"] = transport

    started = time.perf_counter()
    error: str | None = None
    health = WorkerHealth.DOWN
    latency_ms: float | None = None

    try:
        async with httpx.AsyncClient(**kwargs) as client:
            response = await client.get(url)
            latency_ms = (time.perf_counter() - started) * 1000
            if response.status_code < 400:
                health = WorkerHealth.OK
            elif response.status_code < 500:
                health = WorkerHealth.WARN
                error = f"HTTP {response.status_code}"
            else:
                health = WorkerHealth.DOWN
                error = f"HTTP {response.status_code}"
    except httpx.HTTPError as exc:
        error = str(exc)

    return WorkerStatus(
        name=name,
        url=url,
        health=health,
        latency_ms=latency_ms,
        last_check_at=datetime.now(UTC),
        error=error,
    )


async def ping_all(workers: list[dict]) -> list[WorkerStatus]:
    tasks = [ping_worker(name=w["name"], url=w["url"]) for w in workers]
    return await asyncio.gather(*tasks)
