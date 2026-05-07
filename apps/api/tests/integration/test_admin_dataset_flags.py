"""Integration tests for dataset flags endpoints."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_dataset_flags_service
from ailiance_demo.main import app
from ailiance_demo.services.dataset_flags import DatasetFlagsService

HEADERS = {"X-Tailscale-User": "test@example.com"}


@pytest.fixture
def client_with_flags(tmp_path: Path):
    flags_dir = tmp_path / "flags"
    svc = DatasetFlagsService(flags_dir=flags_dir)
    app.dependency_overrides[get_dataset_flags_service] = lambda: svc
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_flags_requires_auth(client_with_flags: TestClient) -> None:
    r = client_with_flags.get("/api/admin/datasets/python/flags")
    assert r.status_code == 401


def test_list_flags_empty(client_with_flags: TestClient) -> None:
    r = client_with_flags.get("/api/admin/datasets/python/flags", headers=HEADERS)
    assert r.status_code == 200
    assert r.json() == []


def test_create_flag(client_with_flags: TestClient) -> None:
    r = client_with_flags.post(
        "/api/admin/datasets/python/flags",
        json={"idx": 3, "reason": "bad"},
        headers=HEADERS,
    )
    assert r.status_code == 201
    body = r.json()
    assert body["idx"] == 3
    assert body["reason"] == "bad"
    assert body["flagged_by"] == "test@example.com"


def test_create_and_list(client_with_flags: TestClient) -> None:
    client_with_flags.post(
        "/api/admin/datasets/python/flags",
        json={"idx": 1, "reason": "x"},
        headers=HEADERS,
    )
    r = client_with_flags.get("/api/admin/datasets/python/flags", headers=HEADERS)
    assert r.status_code == 200
    flags = r.json()
    assert len(flags) == 1
    assert flags[0]["idx"] == 1


def test_delete_flag(client_with_flags: TestClient) -> None:
    client_with_flags.post(
        "/api/admin/datasets/python/flags",
        json={"idx": 5, "reason": "dup"},
        headers=HEADERS,
    )
    r = client_with_flags.delete("/api/admin/datasets/python/flags/5", headers=HEADERS)
    assert r.status_code == 204
    flags = client_with_flags.get("/api/admin/datasets/python/flags", headers=HEADERS).json()
    assert flags == []


def test_delete_nonexistent_flag_returns_404(client_with_flags: TestClient) -> None:
    r = client_with_flags.delete("/api/admin/datasets/python/flags/999", headers=HEADERS)
    assert r.status_code == 404
