"""Admin workers status endpoint."""
from fastapi import APIRouter, Depends

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.config import settings
from ailiance_demo.models import WorkerStatus
from ailiance_demo.services.workers import ping_all

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/workers/status", response_model=list[WorkerStatus])
async def workers_status() -> list[WorkerStatus]:
    return await ping_all(settings.workers_to_check)
