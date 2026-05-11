"""Forward chat requests as SSE streams to the ailiance gateway."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

import httpx
import structlog
from pydantic import BaseModel, Field

log = structlog.get_logger()

# Single source of truth: model_id alias -> gateway model name.
# `AILIANCE_ALIASES` derives from the keys so adding a model only requires one edit.
ALIAS_TO_GATEWAY_MODEL: dict[str, str] = {
    # Right-hand side must match the keys in ailiance/src/gateway/server.py
    # MODEL_FORCE_MAP. Sending a name that's NOT in MODEL_FORCE_MAP makes the
    # gateway fall through to its domain router, which produced garbled output
    # in tests because the request reaches a worker that doesn't recognize the
    # model id and degenerates.
    # --- generalist base models served by the gateway ---
    "ailiance/mistral-medium-3.5-128b": "ailiance-mistral",
    "ailiance/gemma4-e4b-curriculum": "ailiance-gemma4",
    "ailiance/eurollm-22b": "ailiance-eurollm",
    "ailiance/gemma3-4b": "ailiance-gemma",
    "ailiance/qwen3-next-80b-a3b-instruct": "ailiance-qwen",
    "ailiance/granite-30b": "ailiance-granite",
    "ailiance/ministral-14b": "ailiance-ministral",
    "ailiance/ministral-14b-reasoning": "ailiance-ministral-reasoning",
    # --- mascarade hardware specialists (Qwen3-4B LoRA on Tower :8004) ---
    "ailiance/mascarade-kicad": "ailiance-kicad",
    "ailiance/mascarade-spice": "ailiance-spice",
    "ailiance/mascarade-stm32": "ailiance-stm32",
    "ailiance/mascarade-emc": "ailiance-emc",
    "ailiance/mascarade-embedded": "ailiance-embedded",
    "ailiance/mascarade-platformio": "ailiance-platformio",
    "ailiance/mascarade-freecad": "ailiance-freecad",
    "ailiance/mascarade-dsp": "ailiance-dsp",
    "ailiance/mascarade-iot": "ailiance-iot",
    "ailiance/mascarade-power": "ailiance-power",
    "ailiance/mascarade-components-review": "ailiance-components-review",
    "ailiance/mascarade-coder": "ailiance-coder",
    # The bare "ailiance" alias triggers the gateway's domain router
    # (Jina v3 embeddings + MLP classifier) — not in MODEL_FORCE_MAP on
    # purpose. We surface the decision in the chat stream via a route
    # preamble (see stream_chat).
    "ailiance/auto": "ailiance",
}

# Worker port → human-readable label, used for the route preamble.
_PORT_LABELS: dict[int, str] = {
    9301: "Mistral Medium 3.5 128B (studio)",
    8502: "Gemma 4 E4B + ailiance curriculum LoRA (macm1)",
    9303: "EuroLLM 22B (studio)",
    9304: "Gemma 3 4B (tower)",
    8002: "Qwen3.5 35B (kxkm-ai)",
}
AILIANCE_ALIASES: frozenset[str] = frozenset(ALIAS_TO_GATEWAY_MODEL)


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
    return model_id in AILIANCE_ALIASES


async def stream_chat(
    req: ChatRequest,
    gateway_url: str,
    http_transport: httpx.BaseTransport | None = None,
) -> AsyncIterator[bytes]:
    """Forward to ailiance gateway, yield SSE chunks (raw bytes) 1:1."""
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

    # Auto-router: ask the gateway who would handle this prompt and emit a
    # one-line preamble so the user sees the routing decision in the chat.
    route_preamble: str | None = None
    if req.model_id == "ailiance/auto":
        last_user = next(
            (
                (m["content"] if isinstance(m, dict) else m.content)
                for m in reversed(req.messages)
                if (m["role"] if isinstance(m, dict) else m.role) == "user"
            ),
            "",
        )
        if last_user:
            try:
                async with httpx.AsyncClient(timeout=5.0) as rc:
                    r = await rc.post(
                        f"{gateway_url}/v1/route", json={"prompt": last_user}
                    )
                    if r.status_code == 200:
                        info = r.json()
                        chosen = info.get("chosen_domain") or "?"
                        port = info.get("chosen_port") or 0
                        worker = _PORT_LABELS.get(port, f"port {port}")
                        sels = info.get("selections", [])[:3]
                        topk = ", ".join(
                            f"{s['domain']} ({s['score']:.2f})" for s in sels
                        )
                        route_preamble = (
                            f"🧭 **Router** → **{worker}** "
                            f"— domaine `{chosen}`  \n"
                            f"_top: {topk}_\n\n---\n\n"
                        )
            except Exception as exc:  # noqa: BLE001
                log.warning("auto_router.preflight_failed", error=str(exc))

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
            if route_preamble:
                preamble = json.dumps({"text": route_preamble})
                yield f"event: token\ndata: {preamble}\n\n".encode()
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
