"""Tests for the gateway_probe stale-while-revalidate cache."""
import asyncio

import pytest

from ailiance_demo.services import gateway_probe


@pytest.fixture(autouse=True)
def _clear_cache():
    gateway_probe._cache.clear()
    gateway_probe._refreshing.clear()
    yield
    gateway_probe._cache.clear()
    gateway_probe._refreshing.clear()


@pytest.mark.asyncio
async def test_swr_cold_blocks_then_serves_from_cache() -> None:
    calls = 0

    async def producer() -> str:
        nonlocal calls
        calls += 1
        return f"v{calls}"

    # Cold cache: the first read blocks on the producer.
    assert await gateway_probe._swr("k", producer) == "v1"
    assert calls == 1

    # Fresh cache: the producer is not called again.
    assert await gateway_probe._swr("k", producer) == "v1"
    assert calls == 1


@pytest.mark.asyncio
async def test_swr_stale_serves_old_value_then_refreshes() -> None:
    calls = 0

    async def producer() -> str:
        nonlocal calls
        calls += 1
        return f"v{calls}"

    await gateway_probe._swr("k", producer)  # caches "v1"

    # Age the entry past the TTL.
    ts, value = gateway_probe._cache["k"]
    gateway_probe._cache["k"] = (ts - gateway_probe.TTL_SECONDS - 1, value)

    # A stale read returns the old value immediately, without blocking.
    assert await gateway_probe._swr("k", producer) == "v1"

    # The refresh runs in the background and updates the cache.
    await asyncio.sleep(0.05)
    assert calls == 2
    assert gateway_probe._cache["k"][1] == "v2"


@pytest.mark.asyncio
async def test_swr_collapses_concurrent_stale_refreshes() -> None:
    calls = 0

    async def producer() -> str:
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.02)
        return f"v{calls}"

    await gateway_probe._swr("k", producer)  # caches "v1"
    ts, value = gateway_probe._cache["k"]
    gateway_probe._cache["k"] = (ts - gateway_probe.TTL_SECONDS - 1, value)

    # Three concurrent stale reads must spawn a single background refresh.
    results = await asyncio.gather(*(gateway_probe._swr("k", producer) for _ in range(3)))
    assert results == ["v1", "v1", "v1"]

    await asyncio.sleep(0.1)
    assert calls == 2
