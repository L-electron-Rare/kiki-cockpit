"""Tests for /api/admin/training/* endpoints."""
from pathlib import Path

from fastapi.testclient import TestClient

from ailiance_demo.deps import get_training_runs_provider, get_hf_cache, get_eval_index
from ailiance_demo.main import create_app
from ailiance_demo.services.training_runs_provider import TrainingRunsProvider


def test_list_runs_requires_tailscale_user(tmp_path: Path, empty_hf_cache, empty_eval_index) -> None:
    (tmp_path / "logs").mkdir()
    (tmp_path / "logs" / "demo.log").write_text("Iter 100: Train loss 0.5, Learning Rate 1e-4\n")
    provider = TrainingRunsProvider(roots=[tmp_path / "logs"], machine_label="studio")

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    # Missing header -> 401
    response = client.get("/api/admin/training/runs")
    assert response.status_code == 401


def test_list_runs_returns_runs_with_header(
    tmp_path: Path, empty_hf_cache, empty_eval_index
) -> None:
    (tmp_path / "logs").mkdir()
    (tmp_path / "logs" / "demo.log").write_text(
        "Iter 100: Train loss 0.5, Learning Rate 1e-4\n"
        "Iter 100: Val loss 0.45, Val took 10s\n"
    )
    provider = TrainingRunsProvider(roots=[tmp_path / "logs"], machine_label="studio")

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    response = client.get(
        "/api/admin/training/runs",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    runs = response.json()
    assert len(runs) == 1
    assert runs[0]["id"] == "demo"
    assert runs[0]["last_iter"] == 100


def test_get_run_404(tmp_path: Path, empty_hf_cache, empty_eval_index) -> None:
    provider = TrainingRunsProvider(roots=[tmp_path], machine_label="studio")
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    response = client.get(
        "/api/admin/training/runs/nonexistent",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 404
