"""End-to-end test of /api/public/status with a stubbed gateway probe."""
from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.main import app
from ailiance_demo.models.status import RouterStats, WorkerStatus


@pytest.fixture
def stub_workers() -> list[WorkerStatus]:
    """Reflects the 7-endpoint production fleet as of 2026-05-11."""
    return [
        WorkerStatus(id="studio-mlx", label="Mac Studio · mlx_lm.server :9301", host="studio",
                     healthy=True, latency_ms=15.2, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="studio-eurollm", label="Mac Studio · EuroLLM :9303", host="studio",
                     healthy=True, latency_ms=18.7, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="macm1-mlx", label="macM1 · mlx_lm.server :8502", host="macm1",
                     healthy=False, latency_ms=None, model_loaded=False, uptime_s=0,
                     error="Connection refused"),
        WorkerStatus(id="tower-gemma", label="Tower · llama.cpp Gemma 3 :9304",
                     host="tower (NVIDIA Quadro P2000)",
                     healthy=True, latency_ms=9.4, model_loaded=False, uptime_s=0),
        WorkerStatus(id="tower-ollama", label="Tower · Ollama mascarade :8004",
                     host="tower (autossh tunnel)",
                     healthy=True, latency_ms=12.0, model_loaded=False, uptime_s=600),
        WorkerStatus(id="kxkm-qwen", label="kxkm-ai · llama.cpp Qwen3-Next 80B :8002",
                     host="kxkm-ai (RTX 4090, autossh tunnel)",
                     healthy=True, latency_ms=4.1, model_loaded=True, uptime_s=86400),
        WorkerStatus(id="kxkm-granite", label="kxkm-ai · llama.cpp Granite 30B :8003",
                     host="kxkm-ai (RTX 4090, autossh tunnel)",
                     healthy=True, latency_ms=5.2, model_loaded=True, uptime_s=86400),
    ]


@pytest.mark.asyncio
async def test_status_endpoint(stub_workers):
    async def fake_probe(_url):
        return stub_workers

    async def fake_metrics(_url):
        return RouterStats(cache_hits=42, cache_misses=8, total_requests=50)

    with patch("ailiance_demo.routers.public.status.fetch_workers_status", fake_probe), \
         patch("ailiance_demo.routers.public.status.fetch_router_stats", fake_metrics):
        client = TestClient(app)
        r = client.get("/api/public/status")
    assert r.status_code == 200
    body = r.json()
    assert body["total_count"] == 7
    assert body["healthy_count"] == 6
    ids = [w["id"] for w in body["workers"]]
    assert ids == [
        "studio-mlx", "studio-eurollm", "macm1-mlx", "tower-gemma",
        "tower-ollama", "kxkm-qwen", "kxkm-granite",
    ]
    for worker in body["workers"]:
        assert worker["host"], f"worker {worker['id']} missing host"
    # Timestamp must parse as ISO-8601
    datetime.fromisoformat(body["timestamp"])


def test_workers_constant_matches_production_fleet():
    """The hard-coded WORKERS list is the single source of truth for /status."""
    from ailiance_demo.services.gateway_probe import WORKERS

    ids = {w["id"] for w in WORKERS}
    assert ids == {
        "studio-mlx", "studio-eurollm", "macm1-mlx", "tower-gemma",
        "tower-ollama", "kxkm-qwen", "kxkm-granite",
    }
    by_id = {w["id"]: w for w in WORKERS}
    # kxkm-* and tower-ollama reach the cockpit via autossh tunnels owned by
    # the gateway host; from inside the api container we must talk to
    # host.docker.internal.
    assert "host.docker.internal" in by_id["kxkm-qwen"]["url"]
    assert "host.docker.internal" in by_id["kxkm-granite"]["url"]
    assert "host.docker.internal" in by_id["tower-ollama"]["url"]
    # Other workers are addressed over Tailscale magic DNS.
    assert by_id["studio-mlx"]["url"] == "http://studio:9301"
    assert by_id["tower-gemma"]["url"] == "http://tower:9304"
