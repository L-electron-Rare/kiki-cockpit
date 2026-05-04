"""Admin liveness probe (no auth at this stage; gated by Tailscale infra in deploy)."""
from fastapi import APIRouter
from kiki_cockpit.routers.public.health import HealthResponse

router = APIRouter(tags=["admin"])


@router.get("/api/admin/healthz", response_model=HealthResponse)
async def admin_healthz() -> HealthResponse:
    from kiki_cockpit import __version__
    return HealthResponse(status="ok", service="kiki-cockpit-admin", version=__version__)
