"""Walk eval result JSON files, build in-memory index, expose summaries."""
from __future__ import annotations

import json
from pathlib import Path

import structlog

from ailiance_demo.models import EvalResult, EvalSummary

log = structlog.get_logger()


class EvalIndex:
    def __init__(self, roots: list[Path]) -> None:
        self.roots = roots
        self._by_model: dict[str, list[EvalResult]] = {}

    def refresh(self) -> None:
        self._by_model.clear()
        for root in self.roots:
            if not root.exists():
                log.info("eval_index.root_missing", root=str(root))
                continue
            for path in root.rglob("*.json"):
                try:
                    payload = json.loads(path.read_text())
                except (OSError, json.JSONDecodeError) as exc:
                    log.warning("eval_index.parse_failed", path=str(path), error=str(exc))
                    continue
                try:
                    result = EvalResult.model_validate(payload)
                except ValueError as exc:
                    log.warning("eval_index.schema_mismatch", path=str(path), error=str(exc))
                    continue
                self._by_model.setdefault(result.model_id, []).append(result)
        log.info("eval_index.refresh.done", models=len(self._by_model))

    def summary_for(self, model_id: str) -> EvalSummary | None:
        results = self._by_model.get(model_id)
        if not results:
            return None
        latest_per_benchmark: dict[str, EvalResult] = {}
        for r in results:
            existing = latest_per_benchmark.get(r.benchmark)
            if existing is None or r.timestamp > existing.timestamp:
                latest_per_benchmark[r.benchmark] = r
        return EvalSummary(model_id=model_id, by_benchmark=latest_per_benchmark)

    def top_score_for(self, model_id: str) -> tuple[str, float] | None:
        summary = self.summary_for(model_id)
        if summary is None or not summary.by_benchmark:
            return None
        best = max(summary.by_benchmark.values(), key=lambda r: r.score)
        return (best.benchmark, best.score)
