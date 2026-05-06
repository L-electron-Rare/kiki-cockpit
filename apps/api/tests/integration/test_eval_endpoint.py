"""Tests for /api/public/eval/{owner}/{name}."""
from pathlib import Path
import json

from fastapi.testclient import TestClient

from ailiance_demo.main import create_app
from ailiance_demo.deps import get_eval_index, get_hf_cache
from ailiance_demo.services.eval_index import EvalIndex


def test_eval_summary_returns_per_benchmark(tmp_path: Path, empty_hf_cache) -> None:
    payload = {
        "model_id": "clemsail/micro-kiki-v3",
        "benchmark": "HumanEval+",
        "metric": "pass@1",
        "score": 0.78,
        "timestamp": "2026-04-30T12:00:00Z",
    }
    (tmp_path / "result.json").write_text(json.dumps(payload))

    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: index
    client = TestClient(app)

    response = client.get("/api/public/eval/clemsail/micro-kiki-v3")
    assert response.status_code == 200
    data = response.json()
    assert "HumanEval+" in data["by_benchmark"]
    assert data["by_benchmark"]["HumanEval+"]["score"] == 0.78


def test_eval_summary_404_when_unknown(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/public/eval/clemsail/unknown")
    assert response.status_code == 404
