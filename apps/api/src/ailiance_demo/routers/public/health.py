"""Public liveness probe."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["public"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/api/public/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    from ailiance_demo import __version__
    return HealthResponse(status="ok", service="ailiance-demo", version=__version__)
