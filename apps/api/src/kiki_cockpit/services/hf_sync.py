"""HuggingFace API sync — fetch model metadata, cache in memory."""
from __future__ import annotations

import structlog
import httpx

log = structlog.get_logger()


async def fetch_models_for_owner(
    client: httpx.AsyncClient,
    owner: str,
    limit: int = 100,
) -> list[dict]:
    """Fetch all model metadata for a given owner/org from HF API.

    Returns the raw JSON list. Returns [] on 404 or other client errors.
    """
    try:
        response = await client.get(
            "/api/models",
            params={"author": owner, "limit": limit, "full": "false"},
        )
    except httpx.HTTPError as exc:
        log.warning("hf_sync.fetch_failed", owner=owner, error=str(exc))
        return []

    if response.status_code == 404:
        log.info("hf_sync.owner_not_found", owner=owner)
        return []

    if response.status_code >= 400:
        log.warning(
            "hf_sync.unexpected_status",
            owner=owner,
            status=response.status_code,
        )
        return []

    data = response.json()
    if not isinstance(data, list):
        log.warning("hf_sync.unexpected_payload", owner=owner)
        return []

    return data
