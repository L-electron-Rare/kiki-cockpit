"""Public eval summary endpoint."""
from fastapi import APIRouter, Depends, HTTPException

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
    model_id = f"{owner}/{name}"
    summary = index.summary_for(model_id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"No eval results for {model_id}")
    return summary
