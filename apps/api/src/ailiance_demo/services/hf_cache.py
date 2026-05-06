"""Orchestrate HF API sync + featured.yaml merge + in-memory cache + disk fallback."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import structlog

from ailiance_demo.models import ModelCard, ModelStatus
from ailiance_demo.services.featured import FeaturedConfig
from ailiance_demo.services.hf_sync import fetch_models_for_owner, to_model_card

log = structlog.get_logger()


class HFCache:
    """In-memory cache of ModelCards, refreshed periodically from HF API."""

    def __init__(
        self,
        owners: list[str],
        ailiance_aliases: set[str],
        featured: FeaturedConfig,
        cache_dir: Path,
        http_transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.owners = owners
        self.ailiance_aliases = ailiance_aliases
        self.featured = featured
        self.cache_dir = cache_dir
        self.http_transport = http_transport
        self._cards: list[ModelCard] = []
        self._lock = asyncio.Lock()

    def list_cards(self) -> list[ModelCard]:
        """Return current cached cards (may be empty before first refresh)."""
        return list(self._cards)

    def get_card(self, model_id: str) -> ModelCard | None:
        for c in self._cards:
            if c.id == model_id:
                return c
        return None

    async def refresh(self) -> None:
        """Fetch from all owners, merge, apply featured/deprecated overlays, cache."""
        async with self._lock:
            log.info("hfcache.refresh.start", owners=self.owners)
            kwargs: dict = {"base_url": "https://huggingface.co", "timeout": 30.0}
            if self.http_transport is not None:
                kwargs["transport"] = self.http_transport
            async with httpx.AsyncClient(**kwargs) as client:
                tasks = [fetch_models_for_owner(client, owner) for owner in self.owners]
                results = await asyncio.gather(*tasks)

            cards: list[ModelCard] = []
            for raw_list in results:
                for raw in raw_list:
                    cards.append(to_model_card(raw, ailiance_aliases=self.ailiance_aliases))

            for card in cards:
                if card.id in self.featured.deprecated:
                    card.status = ModelStatus.DEPRECATED
                    dep = self.featured.deprecated[card.id]
                    if hasattr(card, "deprecated_note"):
                        card.deprecated_note = dep.note  # type: ignore[attr-defined]
                    continue
                feat = self.featured.featured_for_id(card.id)
                if feat is not None:
                    card.status = ModelStatus.FEATURED
                    card.featured_rank = feat.rank
                    card.featured_headline = feat.headline
                if card.id in self.featured.aliases:
                    card.display_name = self.featured.aliases[card.id]

            self._cards = sorted(
                cards,
                key=lambda c: (
                    c.featured_rank if c.featured_rank is not None else 999,
                    -c.downloads,
                ),
            )

            self._write_disk_cache()
            log.info("hfcache.refresh.done", count=len(self._cards))

    def _write_disk_cache(self) -> None:
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            payload = [c.model_dump(mode="json") for c in self._cards]
            (self.cache_dir / "hf-models.json").write_text(json.dumps(payload, indent=2))
        except OSError as exc:
            log.warning("hfcache.disk_write_failed", error=str(exc))

    def load_disk_cache(self) -> bool:
        path = self.cache_dir / "hf-models.json"
        if not path.exists():
            return False
        try:
            data = json.loads(path.read_text())
            self._cards = [ModelCard.model_validate(item) for item in data]
            log.info("hfcache.disk_load", count=len(self._cards))
            return True
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            log.warning("hfcache.disk_load_failed", error=str(exc))
            return False
