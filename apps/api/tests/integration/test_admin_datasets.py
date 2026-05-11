import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_datasets_service
from ailiance_demo.main import app
from ailiance_demo.services.datasets import DatasetsService


@pytest.fixture
def client_with_datasets(tmp_path: Path):
    elec = tmp_path / "electronics-hw"
    elec.mkdir()
    (elec / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "Ailiance-fr/oshwa",
                "license": "CERN-OHL-S-2.0",
                "download_date": "2026-04-26",
                "n_used": 4321,
            }
        )
    )
    (elec / "train.jsonl").write_text(
        json.dumps(
            {"messages": [
                {"role": "user", "content": "Pull-up?"},
                {"role": "assistant", "content": "Resistor to VCC"},
            ]}
        )
        + "\n"
    )

    app.dependency_overrides[get_datasets_service] = lambda: DatasetsService(roots=[tmp_path])
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_datasets_requires_tailscale_user(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get("/api/admin/datasets")
    assert r.status_code == 401


def test_list_datasets_returns_summaries(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["domain"] == "electronics-hw"


def test_get_dataset_returns_samples(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets/electronics-hw",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["samples"][0]["user"] == "Pull-up?"


def test_get_unknown_dataset_returns_404(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets/missing",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 404
