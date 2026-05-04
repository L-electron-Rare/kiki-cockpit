"""Tests for /api/admin/workers/status."""
from fastapi.testclient import TestClient

from kiki_cockpit.deps import get_hf_cache, get_eval_index
from kiki_cockpit.main import create_app


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
    # 4 default workers configured: gateway, apertus, devstral, eurollm
    assert len(workers) == 4
    # All down because tests don't have real workers
    assert all(w["health"] == "down" for w in workers)
