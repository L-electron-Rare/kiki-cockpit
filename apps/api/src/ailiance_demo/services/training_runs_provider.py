"""Provider that ties discovery + log tailing into a unified interface."""
from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Protocol

import structlog

from ailiance_demo.models import TrainingRun
from ailiance_demo.services.log_tail import parse_line
from ailiance_demo.services.training_runs import discover_runs

log = structlog.get_logger()


class _DisconnectProbe(Protocol):
    """Minimal interface for probing client disconnect — Starlette's Request fits."""

    async def is_disconnected(self) -> bool: ...


class TrainingRunsProvider:
    def __init__(self, roots: list[Path], machine_label: str) -> None:
        self.roots = roots
        self.machine_label = machine_label

    def list_runs(self) -> list[TrainingRun]:
        return discover_runs(self.roots, self.machine_label)

    def get_run(self, run_id: str) -> TrainingRun | None:
        for run in self.list_runs():
            if run.id == run_id:
                return run
        return None

    async def tail_log_sse(
        self,
        run_id: str,
        disconnect_probe: _DisconnectProbe | None = None,
    ) -> AsyncIterator[bytes]:
        """Stream SSE events from the log of `run_id`.

        Honors client disconnect via `disconnect_probe.is_disconnected()` so that
        tail loops do not leak server-side coroutines after the browser closes.
        """
        run = self.get_run(run_id)
        if run is None:
            yield b'event: error\ndata: {"message":"run not found"}\n\n'
            return

        log_path = Path(run.log_path)
        if not log_path.exists():
            yield b'event: error\ndata: {"message":"log file missing"}\n\n'
            return

        # Initial: send the entire current content as raw events, then tail for new data
        existing = log_path.read_text(errors="replace")
        for line in existing.splitlines():
            event = self._line_to_event(line)
            if event:
                yield event

        # Tail for new lines, polling 500ms with disconnect check between each poll
        with log_path.open("r") as f:
            f.seek(0, 2)  # end
            while True:
                if disconnect_probe is not None and await disconnect_probe.is_disconnected():
                    log.info("tail_log_sse.client_disconnected", run_id=run_id)
                    break
                pos = f.tell()
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.5)
                    f.seek(pos)
                    continue
                event = self._line_to_event(line.rstrip("\n"))
                if event:
                    yield event

    def _line_to_event(self, line: str) -> bytes | None:
        if not line:
            return None
        metric = parse_line(line)
        if metric is not None:
            payload = metric.model_dump(mode="json")
            payload["type"] = "iter"
            return f"event: iter\ndata: {json.dumps(payload)}\n\n".encode()
        # raw line
        return f"event: raw\ndata: {json.dumps({'line': line})}\n\n".encode()
