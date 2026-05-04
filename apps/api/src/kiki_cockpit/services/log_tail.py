"""Parse mlx_lm training log format. Reuses regex from KIKI-Mac_tunner/scripts/training_tui.py."""
from __future__ import annotations

import re

from kiki_cockpit.models import TrainingMetric

_VAL_RE = re.compile(r"Iter (\d+): Val loss ([\d.eE+-]+), Val took ([\d.]+)s")
_TRAIN_RE = re.compile(
    r"Iter (\d+): Train loss ([\d.eE+-]+), Learning Rate ([\d.eE+-]+)"
)


def parse_line(line: str) -> TrainingMetric | None:
    line = line.strip()
    if not line:
        return None

    if (m := _VAL_RE.match(line)) is not None:
        return TrainingMetric(
            iter=int(m.group(1)),
            split="val",
            loss=float(m.group(2)),
            took_s=float(m.group(3)),
        )

    if (m := _TRAIN_RE.match(line)) is not None:
        return TrainingMetric(
            iter=int(m.group(1)),
            split="train",
            loss=float(m.group(2)),
            lr=float(m.group(3)),
        )

    return None
