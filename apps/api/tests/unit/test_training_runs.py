"""Tests for training_runs discovery."""
from datetime import datetime, UTC
from pathlib import Path

from ailiance_demo.models import TrainingRunStatus
from ailiance_demo.services.training_runs import discover_runs, summarize_run

FIXTURE = Path(__file__).parent.parent / "fixtures" / "training_logs"


def test_discover_runs_finds_log_files(tmp_path: Path) -> None:
    (tmp_path / "logs").mkdir()
    sample = (FIXTURE / "sample.log").read_text()
    (tmp_path / "logs" / "mistral-large-opus.log").write_text(sample)
    (tmp_path / "logs" / "qwen-35b.log").write_text(sample)

    runs = discover_runs(roots=[tmp_path / "logs"], machine_label="studio")

    assert len(runs) == 2
    ids = {r.id for r in runs}
    assert "mistral-large-opus" in ids
    assert "qwen-35b" in ids
    assert all(r.machine == "studio" for r in runs)


def test_summarize_run_extracts_last_metrics(tmp_path: Path) -> None:
    sample = (FIXTURE / "sample.log").read_text()
    log_path = tmp_path / "test.log"
    log_path.write_text(sample)

    run = summarize_run(log_path, machine_label="studio", active_threshold_seconds=60)

    assert run.id == "test"
    assert run.last_iter == 400
    assert run.last_train_loss == 0.479
    assert run.last_val_loss == 0.532
    # File was just written so it's "active" within threshold
    assert run.status == TrainingRunStatus.ACTIVE


def test_summarize_run_marks_old_files_completed(tmp_path: Path) -> None:
    import os
    import time
    sample = (FIXTURE / "sample.log").read_text()
    log_path = tmp_path / "old.log"
    log_path.write_text(sample)
    # Set mtime to 10 minutes ago
    old_time = time.time() - 600
    os.utime(log_path, (old_time, old_time))

    run = summarize_run(log_path, machine_label="studio", active_threshold_seconds=300)
    assert run.status == TrainingRunStatus.COMPLETED
