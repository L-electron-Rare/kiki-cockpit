"""Admin benchmarks endpoint."""
from fastapi import APIRouter, Depends

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.deps import get_benchmarks_service
from ailiance_demo.models.benchmark import BenchmarkRun
from ailiance_demo.services.benchmarks import BenchmarksService

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/benchmarks", response_model=list[BenchmarkRun])
def list_benchmarks(
    svc: BenchmarksService = Depends(get_benchmarks_service),
) -> list[BenchmarkRun]:
    return svc.list()
