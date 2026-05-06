"""Admin healthz endpoint tests."""
from fastapi.testclient import TestClient


def test_admin_healthz_returns_ok(client: TestClient) -> None:
    response = client.get("/api/admin/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "ailiance-demo-admin"
