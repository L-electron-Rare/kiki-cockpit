"""Admin liveness probe (no auth at this stage; gated by Tailscale infra in deploy)."""
from fastapi import APIRouter
from ailiance_demo.routers.public.health import HealthResponse

router = APIRouter(tags=["admin"])


@router.get("/api/admin/healthz", response_model=HealthResponse)
async def admin_healthz() -> HealthResponse:
    from ailiance_demo import __version__
    return HealthResponse(status="ok", service="ailiance-demo-admin", version=__version__)
