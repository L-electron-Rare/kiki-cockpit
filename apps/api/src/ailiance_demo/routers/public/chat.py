"""POST /api/public/chat — SSE proxy to ailiance gateway."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ailiance_demo.config import settings
from ailiance_demo.services.chat_proxy import (
    ChatRequest,
    is_chat_eligible,
    stream_chat,
)

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(req: ChatRequest, request: Request) -> StreamingResponse:  # noqa: ARG001
    if not is_chat_eligible(req.model_id):
        owner_name = req.model_id.split("/", 1)
        hf_url = (
            f"https://huggingface.co/{req.model_id}"
            if len(owner_name) == 2
            else "https://huggingface.co"
        )
        raise HTTPException(
            status_code=501,
            detail={
                "message": f"Model {req.model_id} not served locally in sprint 1",
                "hf_url": hf_url,
            },
        )

    async def gen():
        async for chunk in stream_chat(req, gateway_url=settings.ailiance_gateway_url):
            yield chunk

    return StreamingResponse(gen(), media_type="text/event-stream")
