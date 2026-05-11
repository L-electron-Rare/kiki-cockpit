"""Async probe of the ailiance gateway's /health and /metrics.

We fetch both, parse them into typed Pydantic models, and cache the
result for 30 seconds. The cockpit calls this every page load; without
caching we'd amplify gateway load by 100x for no benefit.
"""
from __future__ import annotations

import re
import time
from collections.abc import Iterable

import httpx
import structlog

from ailiance_demo.models.status import RouterStats, WorkerStatus

log = structlog.get_logger()

WORKERS = [
    {
        "id": "studio-mlx",
        "label": "Mac Studio · mlx_lm.server :9301",
        "url": "http://studio:9301",
        "host": "studio",
        "gpu": "Apple M3 Ultra (76-core GPU)",
        "vram_gb": 512.0,
        "tdp_w": 215,
        "gateway_aliases": ["ailiance-mistral", "ailiance-mistral-medium"],
        "served_models": [
            "Mistral-Medium-3.5-128B-MLX-Q8",
            "Qwen2.5-32B-Instruct-4bit",
            "Qwen2.5-7B-Instruct-4bit",
            "gemma-4-E4B-it-MLX-4bit",
        ],
    },
    {
        "id": "studio-eurollm",
        "label": "Mac Studio · EuroLLM :9303",
        "url": "http://studio:9303",
        "host": "studio",
        "gpu": "Apple M3 Ultra (76-core GPU)",
        "vram_gb": 512.0,
        "tdp_w": 215,
        "gateway_aliases": ["ailiance-eurollm"],
        "served_models": ["EuroLLM-22B-Instruct-2512"],
    },
    {
        "id": "macm1-mlx",
        "label": "macM1 · mlx_lm.server :8502",
        "url": "http://macm1:8502",
        "host": "macm1",
        "gpu": "Apple M1 (8-core GPU)",
        "vram_gb": 32.0,
        "tdp_w": 30,
        "gateway_aliases": ["ailiance-gemma2", "ailiance-gemma4", "ailiance-ministral", "ailiance-granite"],
        "served_models": [
            "gemma-4-E4B-it-MLX-4bit",
            "gemma-4-E2B-it-MLX-4bit",
            "gemma-3-4b-it-4bit",
            "Ministral-3-14B-Instruct-2512-4bit",
            "Ministral-3-14B-Reasoning-2512-4bit",
            "Ministral-3-8B-Instruct-2512-4bit",
            "Ministral-3-3B-Instruct-2512-4bit",
            "granite-4.1-30b-4bit",
            "granite-4.1-3b-4bit",
            "Qwen3.5-9B-MLX-4bit",
            "Qwen2.5-Coder-3B-Instruct-4bit",
            "Qwen2.5-1.5B-Instruct-4bit",
            "Llama-3.2-3B-Instruct-mlx-4Bit",
        ],
    },
    {
        "id": "tower-gemma",
        "label": "Tower · llama.cpp Gemma 3 :9304",
        "url": "http://tower:9304",
        "host": "tower (NVIDIA Quadro P2000)",
        "gpu": "NVIDIA Quadro P2000",
        "vram_gb": 5.0,
        "tdp_w": 75,
        "gateway_aliases": ["ailiance-gemma"],
        "served_models": ["gemma-3-4b-it (Q4 GGUF)"],
    },
    {
        "id": "tower-ollama",
        "label": "Tower · Ollama mascarade :8004",
        "url": "http://host.docker.internal:8004",
        "host": "tower (autossh tunnel)",
        "gpu": "NVIDIA Quadro P2000",
        "vram_gb": 5.0,
        "tdp_w": 75,
        "gateway_aliases": [
            "ailiance-kicad", "ailiance-spice", "ailiance-stm32", "ailiance-emc",
            "ailiance-embedded", "ailiance-platformio", "ailiance-freecad",
            "ailiance-dsp", "ailiance-iot", "ailiance-power",
            "ailiance-components-review", "ailiance-coder",
        ],
        "served_models": [
            "mascarade-kicad", "mascarade-spice", "mascarade-stm32",
            "mascarade-emc", "mascarade-embedded", "mascarade-platformio",
            "mascarade-freecad", "mascarade-dsp", "mascarade-iot",
            "mascarade-power", "mascarade-coder-v2", "mascarade-components-review",
            "mascarade-generic", "qwen2.5-coder:3b", "bge-m3 (embed)",
        ],
    },
    {
        "id": "kxkm-qwen",
        "label": "kxkm-ai · llama.cpp Qwen3-Next 80B :8002",
        "url": "http://host.docker.internal:8002",
        "host": "kxkm-ai (RTX 4090, autossh tunnel)",
        "gpu": "NVIDIA RTX 4090",
        "vram_gb": 24.0,
        "tdp_w": 450,
        "gateway_aliases": ["ailiance-qwen", "ailiance-qwen36", "ailiance"],
        "served_models": ["Qwen3-Next-80B-A3B-Instruct (Q4_K_M MoE)"],
    },
    {
        "id": "kxkm-granite",
        "label": "kxkm-ai · llama.cpp Granite 30B :8003",
        "url": "http://host.docker.internal:8003",
        "host": "kxkm-ai (RTX 4090, autossh tunnel)",
        "gpu": "NVIDIA RTX 4090",
        "vram_gb": 24.0,
        "tdp_w": 450,
        "gateway_aliases": ["ailiance-granite"],
        "served_models": ["granite-4.1-30b-instruct (Q4_K_M)"],
    },
]

# Average tokens per response (rough chat estimate). Used to convert
# the request counter into a tokens_today figure on the UI.
AVG_TOKENS_PER_REQUEST = 280

# SSH probe targets per physical host. Used to fetch live GPU stats via
# `nvidia-smi` (Linux/NVIDIA) or `ioreg` (Apple Silicon). The api container
# has openssh-client and /root/.ssh mounted RO from /home/electron/.ssh.
_HOST_PROBES: dict[str, dict[str, str]] = {
    "studio": {"ssh": "studio", "kind": "apple"},
    "macm1": {"ssh": "macm1", "kind": "apple"},
    "tower": {"ssh": "clems@tower", "kind": "nvidia"},
    "kxkm-ai": {"ssh": "kxkm@10.2.0.237", "kind": "nvidia"},
}


def _host_for_worker(w: dict) -> str | None:
    """Strip parenthetical context from the worker host (e.g.
    'kxkm-ai (RTX 4090, autossh tunnel)' -> 'kxkm-ai')."""
    host = w.get("host", "")
    return host.split(" ")[0].split("(")[0].strip() or None

# Light, mutable cache. The router endpoint sets _cache when it refreshes.
_cache: dict[str, tuple[float, object]] = {}
TTL_SECONDS = 10.0


def _cache_get(key: str) -> object | None:
    if key not in _cache:
        return None
    ts, value = _cache[key]
    if time.monotonic() - ts > TTL_SECONDS:
        return None
    return value


def _cache_set(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)


def _energy_per_day(tdp_w: int | None, healthy: bool) -> float | None:
    """Rough daily energy estimate. Assumes 24h continuous active.

    For DOWN workers we still report the upper-bound estimate so the user
    can see what the worker would draw when running. Real-world figures
    would require a wattmeter — these are conservative TDP-based caps.
    """
    if tdp_w is None:
        return None
    _ = healthy  # could discount when down; keep upper bound for now
    return round(tdp_w * 24 / 1000.0, 2)


def _tokens_today_estimate(body: dict, healthy: bool) -> int | None:
    """If the worker exposes a `tokens_total` counter, derive today's
    contribution from `uptime_s` linearly. Returns None when unknown."""
    if not healthy:
        return None
    tokens_total = body.get("tokens_total")
    uptime_s = body.get("uptime_s", 0)
    if not isinstance(tokens_total, int) or not isinstance(uptime_s, int) or uptime_s <= 0:
        return None
    # Project the daily rate from the lifetime mean. Cap at the lifetime
    # total so a fresh worker doesn't show an inflated number.
    rate_per_s = tokens_total / uptime_s
    return min(int(rate_per_s * 86400), tokens_total)


_MODEL_LABEL_RE = re.compile(r'model="([^"]+)"')


async def _fetch_gateway_request_counts(
    client: httpx.AsyncClient, gateway_url: str
) -> dict[str, int]:
    """Parse `ailiance_gw_requests_total{model="…"}` from /metrics.

    Returns {model_alias: total_count_across_paths_and_statuses}. Errors
    return an empty dict — the worker rows just won't show counters.
    """
    try:
        r = await client.get(f"{gateway_url}/metrics", timeout=2.0)
        if r.status_code != 200:
            return {}
        text = r.text
    except Exception as exc:  # noqa: BLE001
        log.warning("gateway_metrics.fetch_failed", error=str(exc))
        return {}
    out: dict[str, int] = {}
    for ln in text.splitlines():
        if not ln.startswith("ailiance_gw_requests_total"):
            continue
        # ailiance_gw_requests_total{auto="0",model="…",path="proxy",status="200"} 12.0
        match = _MODEL_LABEL_RE.search(ln)
        if not match:
            continue
        model = match.group(1)
        try:
            value = float(ln.rsplit(" ", 1)[1])
        except (ValueError, IndexError):
            continue
        out[model] = out.get(model, 0) + int(value)
    return out


def _requests_for(w: dict, counts: dict[str, int]) -> int:
    """Sum gateway request counts for every alias attached to this worker."""
    aliases = w.get("gateway_aliases") or []
    return sum(counts.get(a, 0) for a in aliases)


async def _fetch_served_models(client: httpx.AsyncClient, w: dict) -> list[str] | None:
    """Try live /v1/models on the worker URL. Falls back to /api/tags for
    Ollama. Returns the static `served_models` config when both fail."""
    fallback = w.get("served_models")
    try:
        r = await client.get(f"{w['url']}/v1/models", timeout=2.0)
        if r.status_code == 200:
            data = r.json()
            ids = [m.get("id") for m in data.get("data", []) if m.get("id")]
            if ids:
                return ids
    except Exception:  # noqa: BLE001
        pass
    # Ollama fallback
    try:
        r = await client.get(f"{w['url']}/api/tags", timeout=2.0)
        if r.status_code == 200:
            data = r.json()
            ids = [m.get("name") for m in data.get("models", []) if m.get("name")]
            if ids:
                return ids
    except Exception:  # noqa: BLE001
        pass
    return fallback


async def _ssh_probe_gpu(host: str) -> dict | None:
    """SSH to the physical host and snapshot the GPU. Linux: nvidia-smi.
    Apple Silicon: ioreg AGXAccelerator. Returns {load_pct, vram_used_mb,
    vram_total_mb, temp_c} or None on failure (host down, no ssh keys, etc.)."""
    probe = _HOST_PROBES.get(host)
    if not probe:
        return None
    ssh_target = probe["ssh"]
    kind = probe["kind"]
    if kind == "nvidia":
        remote_cmd = (
            "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,"
            "temperature.gpu --format=csv,noheader,nounits"
        )
    else:
        # Apple Silicon — Device Utilization % is in ioreg AGXAccelerator
        remote_cmd = (
            "ioreg -rc AGXAccelerator -d 1 2>/dev/null | "
            "awk -F'[<>{}=]+' '/Device Utilization %/ {print $4; exit}'"
        )
    import asyncio
    cmd = [
        "ssh", "-o", "ConnectTimeout=3", "-o", "BatchMode=yes",
        "-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null",
        ssh_target, remote_cmd,
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=4.0)
    except (asyncio.TimeoutError, FileNotFoundError, OSError):
        return None
    if proc.returncode != 0:
        return None
    out = stdout.decode("utf-8", "replace").strip()
    if not out:
        return None
    if kind == "nvidia":
        # "12, 8234, 24576, 45"
        try:
            util, used, total, temp = (s.strip() for s in out.splitlines()[0].split(","))
            return {
                "load_pct": float(util),
                "vram_used_mb": int(float(used)),
                "vram_total_mb": int(float(total)),
                "temp_c": float(temp),
            }
        except (ValueError, IndexError):
            return None
    # apple
    try:
        return {"load_pct": float(out.split()[0]), "vram_used_mb": None,
                "vram_total_mb": None, "temp_c": None}
    except (ValueError, IndexError):
        return None


async def _gather_host_probes() -> dict[str, dict]:
    """Probe every distinct physical host once per cache cycle. Cached."""
    cached = _cache_get("host_probes")
    if isinstance(cached, dict):
        return cached  # type: ignore[return-value]
    import asyncio
    hosts = list(_HOST_PROBES.keys())
    results = await asyncio.gather(*[_ssh_probe_gpu(h) for h in hosts])
    probes = {h: r for h, r in zip(hosts, results) if r is not None}
    _cache_set("host_probes", probes)
    return probes


async def _fetch_llamacpp_tokens(client: httpx.AsyncClient, w: dict) -> int | None:
    """Read llamacpp:tokens_predicted_total from a llama.cpp /metrics endpoint."""
    try:
        r = await client.get(f"{w['url']}/metrics", timeout=2.0)
        if r.status_code != 200:
            return None
        for ln in r.text.splitlines():
            if ln.startswith("llamacpp:tokens_predicted_total"):
                try:
                    return int(float(ln.rsplit(" ", 1)[1]))
                except (ValueError, IndexError):
                    return None
    except Exception:  # noqa: BLE001
        return None
    return None


async def _probe_one(
    client: httpx.AsyncClient,
    w: dict,
    request_counts: dict[str, int],
    host_probes: dict[str, dict] | None = None,
) -> WorkerStatus:
    started = time.monotonic()
    # Live served_models + (optional) tokens from the worker itself
    served_models_live = await _fetch_served_models(client, w)
    tokens_live = await _fetch_llamacpp_tokens(client, w)
    # Live GPU stats from the host (shared across workers on the same host)
    host_key = _host_for_worker(w)
    gpu_probe = (host_probes or {}).get(host_key) if host_key else None
    static_md = {
        "gpu": w.get("gpu"),
        "vram_gb": w.get("vram_gb"),
        "tdp_w": w.get("tdp_w"),
        "served_models": served_models_live,
    }
    requests_total = _requests_for(w, request_counts)
    tokens_lifetime = (
        requests_total * AVG_TOKENS_PER_REQUEST if requests_total > 0 else None
    )
    try:
        r = await client.get(f"{w['url']}/health", timeout=2.0)
        ok = r.status_code == 200
        try:
            body = r.json() if ok else {}
        except Exception:  # noqa: BLE001
            body = {}
        latency_ms = round((time.monotonic() - started) * 1000, 1)
        # If /health doesn't exist (404/501) but /v1/models worked (we just
        # fetched served_models above), the backend is reachable — treat it
        # as healthy. This covers Ollama and mlx_lm.server which don't ship
        # a standard /health endpoint.
        if not ok and served_models_live:
            ok = True
            healthy = True
        else:
            # Standard /health bodies usually report {"status": "ok"}; some
            # backends just return 200 with no body — accept either.
            status_str = str(body.get("status", "")).lower()
            healthy = ok and (status_str in ("", "ok", "healthy") or status_str == "200")
        load_pct = body.get("load_pct")
        # Priority order for tokens_today: live llama.cpp counter > worker
        # /health derived estimate > gateway requests × AVG_TOKENS.
        tokens_field = tokens_live
        if tokens_field is None:
            tokens_field = _tokens_today_estimate(body, healthy)
        if tokens_field is None:
            tokens_field = tokens_lifetime
        # Prefer SSH probe over /health-reported load_pct
        if gpu_probe and gpu_probe.get("load_pct") is not None:
            final_load_pct = float(gpu_probe["load_pct"])
        elif isinstance(load_pct, (int, float)):
            final_load_pct = float(load_pct)
        else:
            final_load_pct = None
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=healthy,
            latency_ms=latency_ms,
            model_loaded=bool(body.get("model_loaded", body.get("router_loaded", False))),
            uptime_s=int(body.get("uptime_s", 0)),
            error=None,
            load_pct=final_load_pct,
            tokens_today=tokens_field,
            kwh_per_day=_energy_per_day(static_md["tdp_w"], healthy),
            **static_md,
        )
    except Exception as exc:  # noqa: BLE001
        # If /health is unreachable but /v1/models did respond (we have a
        # served_models_live list above), the worker is actually serving —
        # mark it healthy but with the /health error attached for debugging.
        fallback_healthy = bool(served_models_live)
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=fallback_healthy,
            latency_ms=round((time.monotonic() - started) * 1000, 1)
            if fallback_healthy
            else None,
            model_loaded=False,
            uptime_s=0,
            error=None if fallback_healthy else str(exc)[:120],
            load_pct=float(gpu_probe["load_pct"]) if gpu_probe else None,
            tokens_today=tokens_live if tokens_live is not None else tokens_lifetime,
            kwh_per_day=_energy_per_day(static_md["tdp_w"], healthy=fallback_healthy),
            **static_md,
        )


async def fetch_workers_status(gateway_url: str) -> list[WorkerStatus]:
    """Probe every worker we know about. Cached 10 s."""
    cached = _cache_get("workers")
    if isinstance(cached, list):
        return cached  # type: ignore[return-value]
    async with httpx.AsyncClient() as client:
        request_counts = await _fetch_gateway_request_counts(client, gateway_url)
        host_probes = await _gather_host_probes()
        results = []
        for w in WORKERS:
            results.append(
                await _probe_one(client, w, request_counts, host_probes)
            )
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
    hits = _parse_prom_counter(lines, "ailiance_router_cache_hits_total")
    misses = _parse_prom_counter(lines, "ailiance_router_cache_misses_total")
    requests = _parse_prom_counter(lines, "ailiance_gw_requests_total")
    # Sum across labels for the headline numbers
    stats = RouterStats(
        cache_hits=int(sum(hits.values())),
        cache_misses=int(sum(misses.values())),
        total_requests=int(sum(requests.values())),
        per_model_requests={k.strip("{}"): int(v) for k, v in requests.items()},
    )
    _cache_set("router_stats", stats)
    return stats
