"""Parse featured.yaml — manual curation overlay for the public showcase."""
from __future__ import annotations

from pathlib import Path

import structlog
import yaml
from pydantic import BaseModel, Field

log = structlog.get_logger()


class FeaturedEntry(BaseModel):
    id: str
    rank: int
    headline: str | None = None


class DeprecatedEntry(BaseModel):
    superseded_by: str | None = None
    note: str | None = None


class FeaturedConfig(BaseModel):
    featured: list[FeaturedEntry] = Field(default_factory=list)
    deprecated: dict[str, DeprecatedEntry] = Field(default_factory=dict)
    aliases: dict[str, str] = Field(default_factory=dict)

    def featured_for_id(self, model_id: str) -> FeaturedEntry | None:
        for entry in self.featured:
            if entry.id == model_id:
                return entry
        return None


def load_featured(path: Path) -> FeaturedConfig:
    """Load and parse featured.yaml. Returns empty config if file is missing."""
    if not path.exists():
        log.info("featured.missing", path=str(path))
        return FeaturedConfig()

    raw = yaml.safe_load(path.read_text()) or {}

    featured_raw = raw.get("featured", []) or []
    featured = [FeaturedEntry.model_validate(f) for f in featured_raw]

    deprecated_raw = raw.get("deprecated", []) or []
    deprecated: dict[str, DeprecatedEntry] = {}
    for d in deprecated_raw:
        d_id = d.get("id")
        if not d_id:
            continue
        deprecated[d_id] = DeprecatedEntry(
            superseded_by=d.get("superseded_by"),
            note=d.get("note"),
        )

    aliases = raw.get("aliases", {}) or {}

    return FeaturedConfig(featured=featured, deprecated=deprecated, aliases=aliases)
