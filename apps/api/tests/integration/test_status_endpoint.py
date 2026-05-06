"""End-to-end test of /api/public/status with a stubbed gateway probe."""
from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from kiki_cockpit.main import app
from kiki_cockpit.models.status import RouterStats, WorkerStatus


@pytest.fixture
def stub_workers() -> list[WorkerStatus]:
    return [
        WorkerStatus(id="apertus", label="Apertus 70B", host="studio",
                     healthy=True, latency_ms=15.2, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="devstral", label="Devstral 24B", host="macm1",
                     healthy=False, latency_ms=None, model_loaded=False, uptime_s=0,
                     error="Connection refused"),
    ]


@pytest.mark.asyncio
async def test_status_endpoint(stub_workers):
    async def fake_probe(_url):
        return stub_workers

    async def fake_metrics(_url):
        return RouterStats(cache_hits=42, cache_misses=8, total_requests=50)

    with patch("kiki_cockpit.routers.public.status.fetch_workers_status", fake_probe), \
         patch("kiki_cockpit.routers.public.status.fetch_router_stats", fake_metrics):
        client = TestClient(app)
        r = client.get("/api/public/status")
    assert r.status_code == 200
    body = r.json()
    assert body["total_count"] == 2
    assert body["healthy_count"] == 1
    assert body["workers"][0]["id"] == "apertus"
    # Timestamp must parse as ISO-8601
    datetime.fromisoformat(body["timestamp"])
