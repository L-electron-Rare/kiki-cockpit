"""Load benchmark results from a static YAML file."""
from __future__ import annotations

from pathlib import Path

import yaml

from ailiance_demo.models.benchmark import BenchmarkRun


class BenchmarksService:
    def __init__(self, yaml_path: Path) -> None:
        self._yaml_path = yaml_path

    def list(self) -> list[BenchmarkRun]:
        """Return all benchmark rows sorted by (benchmark asc, score desc)."""
        raw = yaml.safe_load(self._yaml_path.read_text())
        rows = [BenchmarkRun(**item) for item in raw.get("benchmarks", [])]
        return sorted(rows, key=lambda r: (r.benchmark, -r.score))
