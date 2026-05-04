"""Tests for require_tailscale_user."""
import pytest
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient

from kiki_cockpit.auth.tailscale import require_tailscale_user


@pytest.fixture
def app_with_protected() -> TestClient:
    app = FastAPI()

    @app.get("/protected")
    def protected(user: str = Depends(require_tailscale_user)) -> dict:
        return {"user": user}

    return TestClient(app)


def test_returns_401_when_header_missing(app_with_protected: TestClient) -> None:
    response = app_with_protected.get("/protected")
    assert response.status_code == 401


def test_returns_401_when_header_empty(app_with_protected: TestClient) -> None:
    response = app_with_protected.get("/protected", headers={"X-Tailscale-User": ""})
    assert response.status_code == 401


def test_passes_when_header_present(app_with_protected: TestClient) -> None:
    response = app_with_protected.get(
        "/protected", headers={"X-Tailscale-User": "valerie@saillant.cc"}
    )
    assert response.status_code == 200
    assert response.json() == {"user": "valerie@saillant.cc"}
