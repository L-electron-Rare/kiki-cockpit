"""Public eval summary endpoint."""
from fastapi import APIRouter, Depends

from ailiance_demo.deps import get_eval_index
from ailiance_demo.models import EvalSummary
from ailiance_demo.services.eval_index import EvalIndex

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/eval/{owner}/{name}", response_model=EvalSummary)
def get_eval_summary(
    owner: str,
    name: str,
    index: EvalIndex = Depends(get_eval_index),
) -> EvalSummary:
    """Return the eval summary for the model. If we have no recorded results,
    return an empty summary instead of 404 — the detail page conditionally
    hides the Évaluations section when by_benchmark is empty, so an empty
    payload keeps the console clean."""
    model_id = f"{owner}/{name}"
    summary = index.summary_for(model_id)
    if summary is None:
        return EvalSummary(model_id=model_id, by_benchmark={})
    return summary
