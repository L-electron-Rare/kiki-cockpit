"""Tests for /api/public/chat."""
from fastapi.testclient import TestClient


def test_chat_returns_501_for_non_ailiance_model(client_with_full_state: TestClient) -> None:
    response = client_with_full_state.post(
        "/api/public/chat",
        json={"model_id": "clemsail/micro-kiki-v3", "messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 501
    detail = response.json()["detail"]
    assert detail["hf_url"] == "https://huggingface.co/clemsail/micro-kiki-v3"
