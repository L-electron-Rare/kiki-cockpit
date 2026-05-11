"""Tests for HFCache (orchestrator)."""
from pathlib import Path

import httpx
import pytest

from ailiance_demo.services.hf_cache import HFCache
from ailiance_demo.services.featured import FeaturedConfig, FeaturedEntry, DeprecatedEntry


def make_handler(responses: dict[str, list[dict]]):
    def handler(request: httpx.Request) -> httpx.Response:
        owner = request.url.params.get("author")
        return httpx.Response(200, json=responses.get(owner, []))
    return handler


@pytest.mark.asyncio
async def test_hfcache_refresh_merges_owners_and_marks_ailiance() -> None:
    responses = {
        "Ailiance-fr": [
            {"id": "Ailiance-fr/micro-kiki-v3", "downloads": 242},
            {"id": "Ailiance-fr/mascarade-iot", "downloads": 6},
        ],
    }
    transport = httpx.MockTransport(make_handler(responses))
    cache = HFCache(
        owners=["Ailiance-fr"],
        ailiance_aliases={"ailiance/apertus-70b"},
        featured=FeaturedConfig(),
        cache_dir=Path("/tmp/test-cache-refresh"),
        http_transport=transport,
    )

    await cache.refresh()

    cards = cache.list_cards()
    assert len(cards) == 2
    ids = {c.id for c in cards}
    assert ids == {"Ailiance-fr/micro-kiki-v3", "Ailiance-fr/mascarade-iot"}


@pytest.mark.asyncio
async def test_hfcache_applies_featured_rank_and_headline() -> None:
    responses = {"Ailiance-fr": [{"id": "Ailiance-fr/micro-kiki-v3", "downloads": 242}]}
    transport = httpx.MockTransport(make_handler(responses))
    featured = FeaturedConfig(
        featured=[FeaturedEntry(id="Ailiance-fr/micro-kiki-v3", rank=1, headline="HEADLINE")],
    )
    cache = HFCache(
        owners=["Ailiance-fr"],
        ailiance_aliases=set(),
        featured=featured,
        cache_dir=Path("/tmp/test-cache-featured"),
        http_transport=transport,
    )

    await cache.refresh()
    card = cache.list_cards()[0]

    assert card.featured_rank == 1
    assert card.featured_headline == "HEADLINE"
    assert card.status.value == "featured"


@pytest.mark.asyncio
async def test_hfcache_filters_deprecated() -> None:
    responses = {"Ailiance-fr": [{"id": "Ailiance-fr/kiki-stm32-sft-v1", "downloads": 0}]}
    transport = httpx.MockTransport(make_handler(responses))
    featured = FeaturedConfig(
        deprecated={
            "Ailiance-fr/kiki-stm32-sft-v1": DeprecatedEntry(
                superseded_by="Ailiance-fr/kiki-stm32-sft",
                note="empty",
            ),
        },
    )
    cache = HFCache(
        owners=["Ailiance-fr"],
        ailiance_aliases=set(),
        featured=featured,
        cache_dir=Path("/tmp/test-cache-deprecated"),
        http_transport=transport,
    )

    await cache.refresh()
    card = cache.list_cards()[0]
    assert card.status.value == "deprecated"
