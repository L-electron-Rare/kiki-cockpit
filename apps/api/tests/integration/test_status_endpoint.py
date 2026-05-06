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
    """Reflects the 5-worker production fleet as of 2026-05-06."""
    return [
        WorkerStatus(id="apertus", label="Apertus 70B", host="studio",
                     healthy=True, latency_ms=15.2, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="devstral", label="Devstral 24B", host="macm1",
                     healthy=False, latency_ms=None, model_loaded=False, uptime_s=0,
                     error="Connection refused"),
        WorkerStatus(id="eurollm", label="EuroLLM 22B", host="studio",
                     healthy=True, latency_ms=18.7, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="gemma3", label="Gemma 3 4B", host="tower",
                     healthy=True, latency_ms=9.4, model_loaded=False, uptime_s=0),
        WorkerStatus(id="qwen3-next", label="Qwen3-Next 80B",
                     host="kxkm-ai (RTX 4090, via autossh tunnel)",
                     healthy=True, latency_ms=4.1, model_loaded=True, uptime_s=86400),
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
    assert body["total_count"] == 5
    assert body["healthy_count"] == 4
    ids = [w["id"] for w in body["workers"]]
    assert ids == ["apertus", "devstral", "eurollm", "gemma3", "qwen3-next"]
    for worker in body["workers"]:
        assert worker["host"], f"worker {worker['id']} missing host"
    # Timestamp must parse as ISO-8601
    datetime.fromisoformat(body["timestamp"])


def test_workers_constant_matches_production_fleet():
    """The hard-coded WORKERS list is the single source of truth for /status."""
    from ailiance_demo.services.gateway_probe import WORKERS

    ids = {w["id"] for w in WORKERS}
    assert ids == {"apertus", "devstral", "eurollm", "gemma3", "qwen3-next"}
    by_id = {w["id"]: w for w in WORKERS}
    # Qwen reaches the cockpit via the autossh tunnel that the gateway host
    # owns; from inside the api container we must talk to host.docker.internal.
    assert "host.docker.internal" in by_id["qwen3-next"]["url"]
    # Other workers are addressed over Tailscale magic DNS.
    assert by_id["apertus"]["url"] == "http://studio:9301"
    assert by_id["gemma3"]["url"] == "http://tower:9304"
