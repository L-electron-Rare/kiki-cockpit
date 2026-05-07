"""Admin endpoints for sample flagging."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.deps import get_dataset_flags_service
from ailiance_demo.models.dataset import Flag
from ailiance_demo.services.dataset_flags import DatasetFlagsService

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


class FlagCreate(BaseModel):
    idx: int
    reason: str


@router.post(
    "/datasets/{domain}/flags",
    response_model=Flag,
    status_code=status.HTTP_201_CREATED,
)
def create_flag(
    domain: str,
    body: FlagCreate,
    x_tailscale_user: str | None = Header(default=None),
    svc: DatasetFlagsService = Depends(get_dataset_flags_service),
) -> Flag:
    return svc.add_flag(domain, body.idx, body.reason, x_tailscale_user)


@router.get("/datasets/{domain}/flags", response_model=list[Flag])
def list_flags(
    domain: str,
    svc: DatasetFlagsService = Depends(get_dataset_flags_service),
) -> list[Flag]:
    return svc.list_flags(domain)


@router.delete(
    "/datasets/{domain}/flags/{idx}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_flag(
    domain: str,
    idx: int,
    svc: DatasetFlagsService = Depends(get_dataset_flags_service),
) -> None:
    deleted = svc.delete_flag(domain, idx)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=f"Flag idx={idx} not found for domain {domain}",
        )
