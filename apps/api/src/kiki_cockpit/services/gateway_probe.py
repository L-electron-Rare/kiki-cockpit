"""Async probe of the eu-kiki gateway's /health and /metrics.

We fetch both, parse them into typed Pydantic models, and cache the
result for 30 seconds. The cockpit calls this every page load; without
caching we'd amplify gateway load by 100x for no benefit.
"""
from __future__ import annotations

import time
from collections.abc import Iterable

import httpx
import structlog

from kiki_cockpit.models.status import RouterStats, WorkerStatus

log = structlog.get_logger()

WORKERS = [
    {"id": "apertus", "label": "Apertus 70B", "url": "http://studio:9301", "host": "studio"},
    {"id": "devstral", "label": "Devstral 24B", "url": "http://macm1:9302", "host": "macm1"},
    {"id": "eurollm", "label": "EuroLLM 22B", "url": "http://studio:9303", "host": "studio"},
    {"id": "gemma3", "label": "Gemma 3 4B", "url": "http://tower:9304", "host": "tower"},
    {"id": "qwen3-next", "label": "Qwen3-Next 80B", "url": "http://localhost:8002", "host": "kxkm-ai (RTX 4090, via autossh tunnel)"},
]

# Light, mutable cache. The router endpoint sets _cache when it refreshes.
_cache: dict[str, tuple[float, object]] = {}
TTL_SECONDS = 30.0


def _cache_get(key: str) -> object | None:
    if key not in _cache:
        return None
    ts, value = _cache[key]
    if time.monotonic() - ts > TTL_SECONDS:
        return None
    return value


def _cache_set(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)


async def _probe_one(client: httpx.AsyncClient, w: dict) -> WorkerStatus:
    started = time.monotonic()
    try:
        r = await client.get(f"{w['url']}/health", timeout=2.0)
        ok = r.status_code == 200
        body = r.json() if ok else {}
        latency_ms = round((time.monotonic() - started) * 1000, 1)
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=ok and body.get("status") == "ok",
            latency_ms=latency_ms,
            model_loaded=bool(body.get("model_loaded", body.get("router_loaded", False))),
            uptime_s=int(body.get("uptime_s", 0)),
            error=None,
        )
    except Exception as exc:  # noqa: BLE001
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=False,
            latency_ms=None,
            model_loaded=False,
            uptime_s=0,
            error=str(exc)[:120],
        )


async def fetch_workers_status(gateway_url: str) -> list[WorkerStatus]:
    """Probe every worker we know about. Cached 30 s."""
    cached = _cache_get("workers")
    if isinstance(cached, list):
        return cached  # type: ignore[return-value]
    async with httpx.AsyncClient() as client:
        results = []
        for w in WORKERS:
            results.append(await _probe_one(client, w))
    _cache_set("workers", results)
    return results


def _parse_prom_counter(lines: Iterable[str], metric: str) -> dict[str, float]:
    """Parse `metric{label1="x",label2="y"} 12.0` into {labels: value}."""
    out: dict[str, float] = {}
    for ln in lines:
        if not ln.startswith(metric):
            continue
        # split on whitespace — last token is the value
        try:
            label_str, value_str = ln.rsplit(" ", 1)
            out[label_str[len(metric):]] = float(value_str)
        except ValueError:
            continue
    return out


async def fetch_router_stats(gateway_url: str) -> RouterStats:
    """Pull cache hit/miss + per-model request counts from /metrics. Cached 30 s."""
    cached = _cache_get("router_stats")
    if isinstance(cached, RouterStats):
        return cached
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{gateway_url}/metrics")
        text = r.text if r.status_code == 200 else ""
    except Exception as exc:  # noqa: BLE001
        log.warning("router_stats.fetch_failed", error=str(exc))
        text = ""
    lines = text.splitlines()
    hits = _parse_prom_counter(lines, "eu_kiki_router_cache_hits_total")
    misses = _parse_prom_counter(lines, "eu_kiki_router_cache_misses_total")
    requests = _parse_prom_counter(lines, "eu_kiki_gw_requests_total")
    # Sum across labels for the headline numbers
    stats = RouterStats(
        cache_hits=int(sum(hits.values())),
        cache_misses=int(sum(misses.values())),
        total_requests=int(sum(requests.values())),
        per_model_requests={k.strip("{}"): int(v) for k, v in requests.items()},
    )
    _cache_set("router_stats", stats)
    return stats
