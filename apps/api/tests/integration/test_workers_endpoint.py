"""Tests for /api/admin/workers/status."""
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_hf_cache, get_eval_index
from ailiance_demo.main import create_app


def test_workers_status_requires_tailscale(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/admin/workers/status")
    assert response.status_code == 401


def test_workers_status_returns_list(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get(
        "/api/admin/workers/status",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    workers = response.json()
    # 6 default workers configured: gateway + 5-worker production fleet
    # (apertus, devstral, eurollm, gemma3, qwen3-next).
    assert len(workers) == 6
    names = {w["name"] for w in workers}
    assert names == {"gateway", "apertus", "devstral", "eurollm", "gemma3", "qwen3-next"}
    # Each entry must report a valid health status; we don't assert "down"
    # because this test sometimes runs from a host that can actually reach
    # the Tailscale workers (studio, tower, macm1).
    assert all(w["health"] in {"ok", "warn", "down"} for w in workers)
