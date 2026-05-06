"""Discover training runs by walking log directories and parsing them."""
from __future__ import annotations

import time
from datetime import datetime, UTC
from pathlib import Path

import structlog

from ailiance_demo.models import TrainingRun, TrainingRunStatus
from ailiance_demo.services.log_tail import parse_line

log = structlog.get_logger()


def discover_runs(
    roots: list[Path],
    machine_label: str,
    active_threshold_seconds: int = 300,
) -> list[TrainingRun]:
    runs: list[TrainingRun] = []
    for root in roots:
        if not root.exists():
            continue
        for log_path in sorted(root.glob("*.log")):
            try:
                runs.append(summarize_run(log_path, machine_label, active_threshold_seconds))
            except OSError as exc:
                log.warning("training_runs.read_failed", path=str(log_path), error=str(exc))
    return runs


def summarize_run(
    log_path: Path,
    machine_label: str,
    active_threshold_seconds: int = 300,
) -> TrainingRun:
    text = log_path.read_text(errors="replace")
    lines = text.splitlines()

    last_train_loss: float | None = None
    last_val_loss: float | None = None
    last_iter: int | None = None
    for line in lines:
        m = parse_line(line)
        if m is None:
            continue
        last_iter = m.iter
        if m.split == "train":
            last_train_loss = m.loss
        elif m.split == "val":
            last_val_loss = m.loss

    stat = log_path.stat()
    last_update = datetime.fromtimestamp(stat.st_mtime, tz=UTC)
    age = time.time() - stat.st_mtime
    status = TrainingRunStatus.ACTIVE if age <= active_threshold_seconds else TrainingRunStatus.COMPLETED

    return TrainingRun(
        id=log_path.stem,
        log_path=str(log_path),
        machine=machine_label,
        status=status,
        started_at=datetime.fromtimestamp(stat.st_ctime, tz=UTC),
        last_update_at=last_update,
        last_iter=last_iter,
        last_train_loss=last_train_loss,
        last_val_loss=last_val_loss,
    )
