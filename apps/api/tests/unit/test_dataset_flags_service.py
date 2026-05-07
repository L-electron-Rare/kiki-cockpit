"""Unit tests for DatasetFlagsService."""
from pathlib import Path

import pytest

from ailiance_demo.services.dataset_flags import DatasetFlagsService


@pytest.fixture
def svc(tmp_path: Path) -> DatasetFlagsService:
    return DatasetFlagsService(flags_dir=tmp_path / "flags")


def test_list_empty(svc: DatasetFlagsService) -> None:
    assert svc.list_flags("python") == []


def test_add_flag(svc: DatasetFlagsService) -> None:
    flag = svc.add_flag("python", idx=5, reason="bad quality", flagged_by="user@example.com")
    assert flag.idx == 5
    assert flag.reason == "bad quality"
    assert flag.flagged_by == "user@example.com"
    assert flag.flagged_at is not None


def test_list_flags_returns_added(svc: DatasetFlagsService) -> None:
    svc.add_flag("python", idx=1, reason="duplicate", flagged_by=None)
    svc.add_flag("python", idx=2, reason="off-topic", flagged_by="x")
    flags = svc.list_flags("python")
    assert len(flags) == 2
    idxs = {f.idx for f in flags}
    assert idxs == {1, 2}


def test_delete_flag(svc: DatasetFlagsService) -> None:
    svc.add_flag("python", idx=3, reason="test", flagged_by=None)
    result = svc.delete_flag("python", 3)
    assert result is True
    assert svc.list_flags("python") == []


def test_delete_nonexistent_returns_false(svc: DatasetFlagsService) -> None:
    result = svc.delete_flag("python", 999)
    assert result is False


def test_delete_is_tombstone_not_destructive(svc: DatasetFlagsService) -> None:
    """File should have both the flag and tombstone appended."""
    svc.add_flag("python", idx=7, reason="r", flagged_by=None)
    svc.delete_flag("python", 7)
    path = svc._path("python")
    lines = [l for l in path.read_text().splitlines() if l.strip()]
    assert len(lines) == 2


def test_re_add_after_delete(svc: DatasetFlagsService) -> None:
    svc.add_flag("python", idx=4, reason="first", flagged_by=None)
    svc.delete_flag("python", 4)
    svc.add_flag("python", idx=4, reason="second", flagged_by=None)
    flags = svc.list_flags("python")
    assert len(flags) == 1
    assert flags[0].reason == "second"


def test_domains_are_isolated(svc: DatasetFlagsService) -> None:
    svc.add_flag("python", idx=1, reason="a", flagged_by=None)
    svc.add_flag("rust", idx=1, reason="b", flagged_by=None)
    assert len(svc.list_flags("python")) == 1
    assert len(svc.list_flags("rust")) == 1
    assert svc.list_flags("python")[0].reason == "a"
