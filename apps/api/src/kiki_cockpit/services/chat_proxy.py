"""Forward chat requests as SSE streams to the eu-kiki gateway."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
import structlog
from pydantic import BaseModel, Field

log = structlog.get_logger()

# Single source of truth: model_id alias -> gateway model name.
# `EU_KIKI_ALIASES` derives from the keys so adding a model only requires one edit.
ALIAS_TO_GATEWAY_MODEL: dict[str, str] = {
    # Right-hand side must match the keys in eu-kiki/src/gateway/server.py
    # MODEL_FORCE_MAP. Sending a name that's NOT in MODEL_FORCE_MAP makes the
    # gateway fall through to its domain router, which produced garbled output
    # in tests because the request reaches a worker that doesn't recognize the
    # model id and degenerates.
    "eu-kiki/apertus-70b": "eu-kiki-apertus",
    "eu-kiki/devstral-24b": "eu-kiki-devstral",
    "eu-kiki/eurollm-22b": "eu-kiki-eurollm",
}
EU_KIKI_ALIASES: frozenset[str] = frozenset(ALIAS_TO_GATEWAY_MODEL)


class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    model_id: str
    messages: list[ChatMessage] | list[dict] = Field(default_factory=list)
    temperature: float = 0.7
    max_tokens: int = 1024
    system_prompt: str | None = None


def is_chat_eligible(model_id: str) -> bool:
    return model_id in EU_KIKI_ALIASES


async def stream_chat(
    req: ChatRequest,
    gateway_url: str,
    http_transport: httpx.BaseTransport | None = None,
) -> AsyncIterator[bytes]:
    """Forward to eu-kiki gateway, yield SSE chunks (raw bytes) 1:1."""
    if not is_chat_eligible(req.model_id):
        raise ValueError(f"Model {req.model_id} is not chat-eligible (sprint 1)")

    gateway_model = ALIAS_TO_GATEWAY_MODEL[req.model_id]
    payload = {
        "model": gateway_model,
        "messages": [m if isinstance(m, dict) else m.model_dump() for m in req.messages],
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": True,
    }
    if req.system_prompt:
        payload["system"] = req.system_prompt

    kwargs: dict = {"timeout": httpx.Timeout(60.0, read=None)}
    if http_transport is not None:
        kwargs["transport"] = http_transport

    async with httpx.AsyncClient(**kwargs) as client:
        async with client.stream(
            "POST",
            f"{gateway_url}/v1/chat/completions",
            json=payload,
        ) as response:
            if response.status_code >= 400:
                log.warning("chat_proxy.upstream_error", status=response.status_code)
                yield (
                    f'event: error\ndata: {{"status":{response.status_code}}}\n\n'
                ).encode()
                return
            # Translate OpenAI-style SSE chunks (data: {json} / data: [DONE])
            # into the cockpit's expected event format (event: token | done |
            # error). The frontend hook in useChatStream.ts only reacts to
            # those three named events.
            buffer = ""
            async for chunk in response.aiter_text():
                buffer += chunk
                while "\n" in buffer:
                    line, _, buffer = buffer.partition("\n")
                    line = line.rstrip("\r")
                    if not line.startswith("data:"):
                        continue
                    payload_str = line[5:].strip()
                    if not payload_str:
                        continue
                    if payload_str == "[DONE]":
                        yield b"event: done\ndata: {}\n\n"
                        return
                    try:
                        obj = json.loads(payload_str)
                    except json.JSONDecodeError:
                        continue
                    choices = obj.get("choices") or []
                    if not choices:
                        continue
                    delta = choices[0].get("delta") or {}
                    text = delta.get("content")
                    if text:
                        out = json.dumps({"text": text})
                        yield f"event: token\ndata: {out}\n\n".encode()
            yield b"event: done\ndata: {}\n\n"
