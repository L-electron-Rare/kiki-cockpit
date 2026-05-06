"""Tests for /api/admin/eval/results."""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from ailiance_demo.deps import get_hf_cache, get_eval_index
from ailiance_demo.main import create_app
from ailiance_demo.services.eval_index import EvalIndex


def test_eval_browser_requires_tailscale(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/admin/eval/results")
    assert response.status_code == 401


def test_eval_browser_returns_flat_list(tmp_path: Path, empty_hf_cache) -> None:
    p1 = {
        "model_id": "a/b",
        "benchmark": "B1",
        "metric": "m",
        "score": 0.5,
        "timestamp": "2026-04-01T00:00:00Z",
    }
    p2 = {
        "model_id": "a/b",
        "benchmark": "B2",
        "metric": "m",
        "score": 0.8,
        "timestamp": "2026-04-15T00:00:00Z",
    }
    (tmp_path / "1.json").write_text(json.dumps(p1))
    (tmp_path / "2.json").write_text(json.dumps(p2))
    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: index
    client = TestClient(app)

    response = client.get(
        "/api/admin/eval/results",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    # Sorted by timestamp desc
    assert results[0]["benchmark"] == "B2"
