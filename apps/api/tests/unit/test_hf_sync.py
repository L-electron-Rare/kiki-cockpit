"""Tests for HF sync service."""
import json
from pathlib import Path

import httpx
import pytest

from kiki_cockpit.services.hf_sync import fetch_models_for_owner

FIXTURES = Path(__file__).parent.parent / "fixtures" / "hf_responses"


@pytest.mark.asyncio
async def test_fetch_models_for_owner_parses_response() -> None:
    fixture = json.loads((FIXTURES / "clemsail_models.json").read_text())

    def handler(request: httpx.Request) -> httpx.Response:
        assert "/api/models" in str(request.url)
        assert request.url.params["author"] == "clemsail"
        return httpx.Response(200, json=fixture)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="https://huggingface.co") as client:
        models = await fetch_models_for_owner(client, "clemsail")

    assert len(models) == 2
    assert models[0]["id"] == "clemsail/micro-kiki-v3"
    assert models[0]["downloads"] == 242
    assert models[1]["id"] == "clemsail/kiki-stm32-sft"


@pytest.mark.asyncio
async def test_fetch_models_for_owner_empty_when_404() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "User not found"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="https://huggingface.co") as client:
        models = await fetch_models_for_owner(client, "nonexistent")

    assert models == []
