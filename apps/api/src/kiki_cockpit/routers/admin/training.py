"""Admin training runs endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from kiki_cockpit.auth.tailscale import require_tailscale_user
from kiki_cockpit.deps import get_training_runs_provider
from kiki_cockpit.models import TrainingMetric, TrainingRun, TrainingRunDetail

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/training/runs", response_model=list[TrainingRun])
def list_training_runs(provider=Depends(get_training_runs_provider)) -> list[TrainingRun]:
    return provider.list_runs()


@router.get("/training/runs/{run_id}", response_model=TrainingRunDetail)
def get_training_run(
    run_id: str,
    provider=Depends(get_training_runs_provider),
) -> TrainingRunDetail:
    run = provider.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return TrainingRunDetail(**run.model_dump(), metrics=[], raw_lines_tail=[])


# Force TrainingMetric into the OpenAPI schema so generated TS types include it.
# It is the event payload of the SSE log stream below; FastAPI cannot infer the
# type of a StreamingResponse, so we declare it via this dummy 200 model.
@router.get(
    "/training/runs/{run_id}/log-event-schema",
    response_model=TrainingMetric,
    include_in_schema=True,
)
def _training_log_event_schema_marker() -> TrainingMetric:  # pragma: no cover
    """Schema marker — never called at runtime, only used for OpenAPI generation."""
    raise HTTPException(status_code=501, detail="schema-only endpoint")


@router.get("/training/runs/{run_id}/logs")
async def stream_training_logs(
    run_id: str,
    request: Request,
    provider=Depends(get_training_runs_provider),
) -> StreamingResponse:
    run = provider.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return StreamingResponse(
        provider.tail_log_sse(run_id, disconnect_probe=request),
        media_type="text/event-stream",
    )
