"""Tests for /api/public/models."""
from fastapi.testclient import TestClient


def test_list_models_returns_cards(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models")

    assert response.status_code == 200
    cards = response.json()
    ids = {c["id"] for c in cards}
    # 5 live ailiance workers + auto-router + the mocked HF entry.
    assert {
        "ailiance/apertus-70b",
        "ailiance/devstral-24b",
        "ailiance/eurollm-22b",
        "ailiance/gemma3-4b",
        "ailiance/qwen3-next-80b-a3b-instruct",
        "ailiance/auto",
        "Ailiance-fr/micro-kiki-v3",
    }.issubset(ids)
    hf_card = next(c for c in cards if c["id"] == "Ailiance-fr/micro-kiki-v3")
    assert hf_card["chat_eligible"] is False


def test_get_model_returns_single_card(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/Ailiance-fr/micro-kiki-v3")

    assert response.status_code == 200
    card = response.json()
    assert card["display_name"] == "Micro-Ailiance v3"


def test_get_model_404_when_unknown(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/Ailiance-fr/does-not-exist")

    assert response.status_code == 404
