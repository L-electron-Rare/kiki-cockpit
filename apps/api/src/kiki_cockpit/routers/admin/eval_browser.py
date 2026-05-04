"""Admin endpoint to browse all eval results across machines/repos."""
from fastapi import APIRouter, Depends

from kiki_cockpit.auth.tailscale import require_tailscale_user
from kiki_cockpit.deps import get_eval_index
from kiki_cockpit.models import EvalResult
from kiki_cockpit.services.eval_index import EvalIndex

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/eval/results", response_model=list[EvalResult])
def list_eval_results(index: EvalIndex = Depends(get_eval_index)) -> list[EvalResult]:
    flat: list[EvalResult] = []
    for results in index._by_model.values():  # noqa: SLF001
        flat.extend(results)
    return sorted(flat, key=lambda r: r.timestamp, reverse=True)
