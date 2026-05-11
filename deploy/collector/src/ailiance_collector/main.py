"""ailiance-collector — minimal read-only HTTP shim over training logs and eval results.

Endpoints (mirror the JSON shape that ailiance-demo's filesystem services produce
locally — see apps/api/src/ailiance_demo/services/{training_runs,log_tail,eval_index}.py).

  GET  /healthz                          → liveness
  GET  /api/v1/training/runs             → list of {id, name, machine, started_at, log_path}
  GET  /api/v1/training/runs/{id}        → full run metadata
  GET  /api/v1/training/runs/{id}/logs   → SSE stream (tail -F semantics)
  GET  /api/v1/eval/index                → list of {owner, name, results: [{file, mtime}]}
  GET  /api/v1/eval/{owner}/{name}/{rid} → raw eval JSON

Security: bind to Tailscale interface only via uvicorn --host 100.x.y.z.
This service has NO auth — Tailscale ACL is the perimeter.
Path traversal is prevented by resolving every request against the configured
roots and rejecting symlink escapes.
"""
from __future__ import annotations

import asyncio
import json
import os
import re
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

log = structlog.get_logger()


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="COLLECTOR_", env_file=".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 9150
    machine_label: str = os.uname().nodename.split(".")[0]

    # Roots scanned for training logs (file globs *.log, *.jsonl).
    training_log_roots: list[Path] = Field(
        default_factory=lambda: [
            Path.home() / "Documents" / "Projets" / "ailiance-mac-tuner" / "logs",
            Path.home() / "Documents" / "Projets" / "ailiance" / "logs",
        ],
    )
    # Root for eval results; structure expected: {owner}/{name}/{run_id}.json
    eval_results_root: Path = Path.home() / "Documents" / "Projets" / "ailiance" / "eval" / "results"

    # Tail tuning
    tail_poll_interval_seconds: float = 0.5
    tail_chunk_max_bytes: int = 65536


settings = Settings()


# ---------------------------------------------------------------------------
# Path safety
# ---------------------------------------------------------------------------
def _resolve_within(root: Path, relative: str) -> Path:
    """Resolve `relative` under `root`, refusing path traversal or symlink escapes."""
    if not root.exists():
        raise HTTPException(status_code=404, detail=f"root does not exist: {root}")
    candidate = (root / relative).resolve()
    root_resolved = root.resolve()
    try:
        candidate.relative_to(root_resolved)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="path escapes root") from exc
    if not candidate.exists():
        raise HTTPException(status_code=404, detail=f"not found: {relative}")
    return candidate


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class TrainingRun(BaseModel):
    id: str
    name: str
    machine: str
    started_at: float  # epoch seconds (mtime of log)
    log_path: str
    size_bytes: int


class EvalEntry(BaseModel):
    file: str
    mtime: float
    size_bytes: int


class EvalGroup(BaseModel):
    owner: str
    name: str
    results: list[EvalEntry]


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------
_RUN_ID_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _run_id_from_log(p: Path) -> str:
    """Stable ID derived from path components, safe for URL."""
    rel = "_".join(p.parts[-3:])
    return _RUN_ID_RE.sub("-", rel).strip("-")


def _discover_runs() -> list[TrainingRun]:
    runs: list[TrainingRun] = []
    seen: set[str] = set()
    for root in settings.training_log_roots:
        if not root.exists():
            continue
        for log_file in sorted(root.rglob("*.log")) + sorted(root.rglob("*.jsonl")):
            run_id = _run_id_from_log(log_file)
            if run_id in seen:
                continue
            seen.add(run_id)
            try:
                stat = log_file.stat()
            except OSError:
                continue
            runs.append(
                TrainingRun(
                    id=run_id,
                    name=log_file.stem,
                    machine=settings.machine_label,
                    started_at=stat.st_mtime,
                    log_path=str(log_file),
                    size_bytes=stat.st_size,
                )
            )
    runs.sort(key=lambda r: r.started_at, reverse=True)
    return runs


def _runs_index() -> dict[str, TrainingRun]:
    return {r.id: r for r in _discover_runs()}


def _discover_eval() -> list[EvalGroup]:
    root = settings.eval_results_root
    groups: list[EvalGroup] = []
    if not root.exists():
        return groups
    for owner_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        for model_dir in sorted(p for p in owner_dir.iterdir() if p.is_dir()):
            entries: list[EvalEntry] = []
            for f in sorted(model_dir.glob("*.json")):
                try:
                    s = f.stat()
                except OSError:
                    continue
                entries.append(EvalEntry(file=f.name, mtime=s.st_mtime, size_bytes=s.st_size))
            if entries:
                groups.append(EvalGroup(owner=owner_dir.name, name=model_dir.name, results=entries))
    return groups


# ---------------------------------------------------------------------------
# Tail (SSE)
# ---------------------------------------------------------------------------
async def _tail(path: Path, request: Request) -> AsyncIterator[bytes]:
    """SSE byte stream — emits each new line as `data: <line>\\n\\n`. Sends a
    keepalive comment every 15 s so proxies don't drop the connection."""
    last_keepalive = asyncio.get_event_loop().time()
    with path.open("rb") as fh:
        # Start near the end (last 4 KiB) so the client gets recent context.
        try:
            fh.seek(0, os.SEEK_END)
            tail_anchor = max(0, fh.tell() - 4096)
            fh.seek(tail_anchor)
        except OSError:
            fh.seek(0)
        buffer = b""
        while True:
            if await request.is_disconnected():
                return
            chunk = fh.read(settings.tail_chunk_max_bytes)
            if chunk:
                buffer += chunk
                while b"\n" in buffer:
                    line, _, buffer = buffer.partition(b"\n")
                    yield b"data: " + line + b"\n\n"
            else:
                now = asyncio.get_event_loop().time()
                if now - last_keepalive > 15:
                    yield b": keepalive\n\n"
                    last_keepalive = now
                await asyncio.sleep(settings.tail_poll_interval_seconds)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info(
        "ailiance-collector.start",
        machine=settings.machine_label,
        roots=[str(p) for p in settings.training_log_roots],
        eval_root=str(settings.eval_results_root),
    )
    yield


app = FastAPI(title="ailiance-collector", version="0.1.0", lifespan=lifespan)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "machine": settings.machine_label}


@app.get("/api/v1/training/runs", response_model=list[TrainingRun])
def list_runs() -> list[TrainingRun]:
    return _discover_runs()


@app.get("/api/v1/training/runs/{run_id}", response_model=TrainingRun)
def get_run(run_id: str) -> TrainingRun:
    idx = _runs_index()
    if run_id not in idx:
        raise HTTPException(status_code=404, detail="run not found")
    return idx[run_id]


@app.get("/api/v1/training/runs/{run_id}/logs")
async def stream_run_logs(run_id: str, request: Request) -> StreamingResponse:
    idx = _runs_index()
    if run_id not in idx:
        raise HTTPException(status_code=404, detail="run not found")
    path = Path(idx[run_id].log_path)
    return StreamingResponse(
        _tail(path, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/api/v1/eval/index", response_model=list[EvalGroup])
def list_eval() -> list[EvalGroup]:
    return _discover_eval()


@app.get("/api/v1/eval/{owner}/{name}/{result_file}")
def get_eval_result(owner: str, name: str, result_file: str) -> dict:
    base = settings.eval_results_root / owner / name
    target = _resolve_within(base, result_file)
    if target.suffix != ".json":
        raise HTTPException(status_code=400, detail="not a json file")
    try:
        return json.loads(target.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"invalid json: {exc}") from exc
