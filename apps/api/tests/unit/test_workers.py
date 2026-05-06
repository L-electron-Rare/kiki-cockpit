"""Tests for workers ping service."""
import httpx
import pytest

from ailiance_demo.models import WorkerHealth
from ailiance_demo.services.workers import ping_worker


@pytest.mark.asyncio
async def test_ping_worker_returns_ok_on_200() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "healthy"})
    transport = httpx.MockTransport(handler)

    status = await ping_worker(
        name="apertus",
        url="http://test/health",
        transport=transport,
    )
    assert status.health == WorkerHealth.OK
    assert status.latency_ms is not None


@pytest.mark.asyncio
async def test_ping_worker_returns_down_on_5xx() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="unavailable")
    transport = httpx.MockTransport(handler)

    status = await ping_worker(name="x", url="http://test/health", transport=transport)
    assert status.health == WorkerHealth.DOWN


@pytest.mark.asyncio
async def test_ping_worker_returns_down_on_connection_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")
    transport = httpx.MockTransport(handler)

    status = await ping_worker(name="x", url="http://test/health", transport=transport)
    assert status.health == WorkerHealth.DOWN
    assert status.error is not None
