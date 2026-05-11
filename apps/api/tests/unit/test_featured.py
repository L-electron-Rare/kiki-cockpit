"""Tests for featured.yaml parsing."""
from pathlib import Path

from ailiance_demo.services.featured import FeaturedConfig, load_featured

FIXTURE = Path(__file__).parent.parent / "fixtures" / "featured_sample.yaml"


def test_load_featured_parses_all_sections() -> None:
    cfg = load_featured(FIXTURE)

    assert isinstance(cfg, FeaturedConfig)
    assert len(cfg.featured) == 2
    assert cfg.featured[0].id == "clemsail/micro-kiki-v3"
    assert cfg.featured[0].rank == 1
    assert cfg.featured[0].headline.startswith("242 dl")

    assert "electron-rare/kiki-stm32-sft-v1" in cfg.deprecated
    assert cfg.deprecated["electron-rare/kiki-stm32-sft-v1"].superseded_by == "clemsail/kiki-stm32-sft"

    assert cfg.aliases["clemsail/micro-kiki-v3"] == "Micro-Ailiance v3"


def test_load_featured_missing_file_returns_empty(tmp_path: Path) -> None:
    cfg = load_featured(tmp_path / "nonexistent.yaml")

    assert cfg.featured == []
    assert cfg.deprecated == {}
    assert cfg.aliases == {}


def test_get_for_id_returns_featured_metadata() -> None:
    cfg = load_featured(FIXTURE)

    entry = cfg.featured_for_id("clemsail/micro-kiki-v3")
    assert entry is not None
    assert entry.rank == 1

    assert cfg.featured_for_id("clemsail/unknown") is None
