"""Tests for eval_index service."""
from pathlib import Path

from ailiance_demo.services.eval_index import EvalIndex

FIXTURES = Path(__file__).parent.parent / "fixtures" / "eval_results"


def test_eval_index_walks_directory_and_indexes_by_model() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    summaries = index.summary_for("Ailiance-fr/micro-kiki-v3")
    assert summaries is not None
    assert "HumanEval+" in summaries.by_benchmark
    assert "GSM8K" in summaries.by_benchmark
    assert summaries.by_benchmark["HumanEval+"].score == 0.78


def test_eval_index_summary_picks_latest_per_benchmark(tmp_path: Path) -> None:
    older = {
        "model_id": "x/y",
        "benchmark": "B",
        "metric": "m",
        "score": 0.1,
        "timestamp": "2026-01-01T00:00:00Z",
    }
    newer = {
        "model_id": "x/y",
        "benchmark": "B",
        "metric": "m",
        "score": 0.5,
        "timestamp": "2026-04-01T00:00:00Z",
    }
    import json
    (tmp_path / "older.json").write_text(json.dumps(older))
    (tmp_path / "newer.json").write_text(json.dumps(newer))

    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    summary = index.summary_for("x/y")
    assert summary is not None
    assert summary.by_benchmark["B"].score == 0.5


def test_eval_index_unknown_model_returns_none() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    assert index.summary_for("nobody/none") is None


def test_eval_index_top_score_picks_highest() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    top = index.top_score_for("Ailiance-fr/micro-kiki-v3")
    assert top is not None
    assert top[0] == "HumanEval+"
    assert top[1] == 0.78
