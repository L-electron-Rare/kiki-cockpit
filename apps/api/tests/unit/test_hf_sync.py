"""Tests for HF sync service."""
import json
from pathlib import Path

import httpx
import pytest

from kiki_cockpit.services.hf_sync import fetch_models_for_owner, to_model_card
from kiki_cockpit.models import ChatBackend, ModelStatus

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


def test_to_model_card_maps_basic_fields() -> None:
    raw = {
        "id": "clemsail/micro-kiki-v3",
        "author": "clemsail",
        "downloads": 242,
        "likes": 4,
        "lastModified": "2026-04-26T12:34:56.000Z",
        "tags": ["text-generation", "lora", "mistral"],
    }

    card = to_model_card(raw, eu_kiki_aliases=set())

    assert card.id == "clemsail/micro-kiki-v3"
    assert card.owner == "clemsail"
    assert card.name == "micro-kiki-v3"
    assert card.downloads == 242
    assert card.likes == 4
    assert card.status == ModelStatus.PRODUCTION
    assert card.chat_backend == ChatBackend.HF_EXTERNAL
    assert card.chat_eligible is False
    assert card.hf_url == "https://huggingface.co/clemsail/micro-kiki-v3"


def test_to_model_card_marks_eu_kiki_live_models_chat_eligible() -> None:
    raw = {"id": "eu-kiki/apertus-70b", "author": "eu-kiki"}

    card = to_model_card(raw, eu_kiki_aliases={"eu-kiki/apertus-70b"})

    assert card.chat_backend == ChatBackend.EU_KIKI_LIVE
    assert card.chat_eligible is True


def test_to_model_card_zero_downloads_marks_alpha() -> None:
    raw = {
        "id": "clemsail/spikingkiki-v4-adapters",
        "author": "clemsail",
        "downloads": 0,
        "likes": 0,
    }

    card = to_model_card(raw, eu_kiki_aliases=set())

    assert card.status == ModelStatus.ALPHA
