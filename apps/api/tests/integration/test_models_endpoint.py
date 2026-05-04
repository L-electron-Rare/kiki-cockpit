"""Tests for /api/public/models."""
from fastapi.testclient import TestClient


def test_list_models_returns_cards(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models")

    assert response.status_code == 200
    cards = response.json()
    assert len(cards) == 1
    assert cards[0]["id"] == "clemsail/micro-kiki-v3"
    assert cards[0]["chat_eligible"] is False


def test_get_model_returns_single_card(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/clemsail/micro-kiki-v3")

    assert response.status_code == 200
    card = response.json()
    assert card["display_name"] == "Micro-KIKI v3"


def test_get_model_404_when_unknown(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/clemsail/does-not-exist")

    assert response.status_code == 404
