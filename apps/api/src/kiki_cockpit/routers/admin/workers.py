"""Admin workers status endpoint."""
from fastapi import APIRouter, Depends

from kiki_cockpit.auth.tailscale import require_tailscale_user
from kiki_cockpit.config import settings
from kiki_cockpit.models import WorkerStatus
from kiki_cockpit.services.workers import ping_all

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/workers/status", response_model=list[WorkerStatus])
async def workers_status() -> list[WorkerStatus]:
    return await ping_all(settings.workers_to_check)
