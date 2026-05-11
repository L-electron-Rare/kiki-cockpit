import json
from pathlib import Path

import pytest

from ailiance_demo.services.datasets import DatasetsService


@pytest.fixture
def datasets_root(tmp_path: Path) -> Path:
    elec = tmp_path / "electronics-hw"
    elec.mkdir()
    (elec / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "Ailiance-fr/oshwa",
                "license": "CERN-OHL-S-2.0",
                "download_date": "2026-04-26",
                "n_source_rows": 12345,
                "n_used": 4321,
                "notes": "OSHWA curated subset",
            }
        )
    )
    (elec / "train.jsonl").write_text(
        json.dumps(
            {"messages": [{"role": "user", "content": "hello"},
                          {"role": "assistant", "content": "world"}]}
        )
        + "\n"
    )

    code = tmp_path / "python-coding"
    code.mkdir()
    (code / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "bigcode/the-stack-smol",
                "license": "various",
                "download_date": "2026-04-20",
                "n_source_rows": 9999,
                "n_used": 4500,
            }
        )
    )
    (code / "train.jsonl").write_text("")
    return tmp_path


def test_list_returns_one_entry_per_manifest(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    rows = svc.list()
    domains = {r.domain for r in rows}
    assert domains == {"electronics-hw", "python-coding"}


def test_list_includes_n_rows_license_and_size(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    elec = next(r for r in svc.list() if r.domain == "electronics-hw")
    assert elec.n_rows == 4321
    assert elec.license == "CERN-OHL-S-2.0"
    assert elec.size_bytes > 0


def test_get_returns_sample_preview(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    detail = svc.get("electronics-hw", max_samples=3)
    assert detail is not None
    assert len(detail.samples) == 1
    assert detail.samples[0].user == "hello"
    assert detail.samples[0].assistant == "world"


def test_get_unknown_domain_returns_none(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    assert svc.get("does-not-exist") is None
