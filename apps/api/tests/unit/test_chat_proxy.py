"""Tests for chat_proxy service."""
import httpx
import pytest

from kiki_cockpit.services.chat_proxy import (
    ChatRequest,
    is_chat_eligible,
    stream_chat,
    EU_KIKI_ALIASES,
)


def test_is_chat_eligible_returns_true_for_eu_kiki_aliases() -> None:
    for alias in EU_KIKI_ALIASES:
        assert is_chat_eligible(alias) is True


def test_is_chat_eligible_returns_false_for_hf_models() -> None:
    assert is_chat_eligible("clemsail/micro-kiki-v3") is False
    assert is_chat_eligible("electron-rare/mascarade-iot") is False


@pytest.mark.asyncio
async def test_stream_chat_forwards_sse_events() -> None:
    async def server_handler(request: httpx.Request) -> httpx.Response:
        async def emit():
            yield b'event: token\ndata: {"text":"Hello"}\n\n'
            yield b'event: token\ndata: {"text":" world"}\n\n'
            yield b'event: done\ndata: {}\n\n'
        return httpx.Response(200, content=emit(), headers={"content-type": "text/event-stream"})

    transport = httpx.MockTransport(server_handler)

    chat_req = ChatRequest(
        model_id="eu-kiki/apertus-70b",
        messages=[{"role": "user", "content": "hi"}],
        temperature=0.7,
    )

    chunks: list[bytes] = []
    async for chunk in stream_chat(
        chat_req,
        gateway_url="http://gateway:9200",
        http_transport=transport,
    ):
        chunks.append(chunk)

    raw = b"".join(chunks)
    assert b'event: token' in raw
    assert b'"text":"Hello"' in raw
    assert b'event: done' in raw
