from pathlib import Path

import yaml
import pytest
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_benchmarks_service
from ailiance_demo.main import app
from ailiance_demo.services.benchmarks import BenchmarksService

_ROW = {
    "run_id": "test-run",
    "benchmark": "HumanEval+",
    "model": "test/model",
    "adapter": "(base)",
    "score": 80.0,
    "score_unit": "%",
    "delta_vs_base": 0,
    "n_samples": 10,
    "date": "2026-05-04",
    "host": "test-host",
    "verdict": "reference",
    "notes": "integration test",
}


@pytest.fixture
def client_with_benchmarks(tmp_path: Path):
    p = tmp_path / "benchmarks.yaml"
    p.write_text(yaml.dump({"benchmarks": [_ROW]}))
    app.dependency_overrides[get_benchmarks_service] = lambda: BenchmarksService(yaml_path=p)
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_benchmarks_requires_tailscale_user(client_with_benchmarks: TestClient) -> None:
    r = client_with_benchmarks.get("/api/admin/benchmarks")
    assert r.status_code == 401


def test_list_benchmarks_returns_list(client_with_benchmarks: TestClient) -> None:
    r = client_with_benchmarks.get(
        "/api/admin/benchmarks",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["run_id"] == "test-run"
    assert rows[0]["benchmark"] == "HumanEval+"
