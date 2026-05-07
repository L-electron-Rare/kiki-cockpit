from pathlib import Path

import yaml
import pytest

from ailiance_demo.services.benchmarks import BenchmarksService

_MINIMAL_ROW = {
    "run_id": "test-base",
    "benchmark": "HumanEval+",
    "model": "test-model",
    "adapter": "(base)",
    "score": 80.0,
    "score_unit": "%",
    "delta_vs_base": 0,
    "n_samples": 10,
    "date": "2026-05-04",
    "host": "test-host",
    "verdict": "reference",
    "notes": "test",
}

_SECOND_ROW = {
    **_MINIMAL_ROW,
    "run_id": "test-adapter",
    "adapter": "python",
    "score": 75.0,
    "delta_vs_base": -5.0,
    "verdict": "loss",
}


@pytest.fixture
def benchmarks_yaml(tmp_path: Path) -> Path:
    data = {"benchmarks": [_MINIMAL_ROW, _SECOND_ROW]}
    p = tmp_path / "benchmarks.yaml"
    p.write_text(yaml.dump(data))
    return p


def test_list_returns_all_rows(benchmarks_yaml: Path) -> None:
    svc = BenchmarksService(yaml_path=benchmarks_yaml)
    rows = svc.list()
    assert len(rows) == 2


def test_list_sorted_by_benchmark_then_score_desc(benchmarks_yaml: Path) -> None:
    svc = BenchmarksService(yaml_path=benchmarks_yaml)
    rows = svc.list()
    # Both rows are same benchmark; higher score should come first
    assert rows[0].score >= rows[1].score


def test_list_parses_run_id_and_fields(benchmarks_yaml: Path) -> None:
    svc = BenchmarksService(yaml_path=benchmarks_yaml)
    rows = svc.list()
    ids = {r.run_id for r in rows}
    assert "test-base" in ids
    assert "test-adapter" in ids
