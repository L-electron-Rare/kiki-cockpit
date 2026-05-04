"""HuggingFace API sync — fetch model metadata, cache in memory."""
from __future__ import annotations

from datetime import datetime

import structlog
import httpx

from kiki_cockpit.models import ChatBackend, ModelCard, ModelStatus

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


def to_model_card(raw: dict, eu_kiki_aliases: set[str]) -> ModelCard:
    """Map a raw HF API model JSON object to a ModelCard.

    eu_kiki_aliases: model IDs that should be marked chat-eligible (Live stack).
    """
    model_id = raw.get("id") or raw.get("modelId") or ""
    owner, _, name = model_id.partition("/")

    downloads = int(raw.get("downloads") or 0)
    likes = int(raw.get("likes") or 0)
    last_modified_raw = raw.get("lastModified")
    last_modified = (
        datetime.fromisoformat(last_modified_raw.replace("Z", "+00:00"))
        if last_modified_raw
        else None
    )

    is_live = model_id in eu_kiki_aliases
    chat_backend = ChatBackend.EU_KIKI_LIVE if is_live else ChatBackend.HF_EXTERNAL

    if is_live:
        status = ModelStatus.PRODUCTION
    elif downloads == 0 and likes == 0:
        status = ModelStatus.ALPHA
    else:
        status = ModelStatus.PRODUCTION

    return ModelCard(
        id=model_id,
        owner=owner,
        name=name,
        display_name=name.replace("-", " ").title(),
        status=status,
        chat_backend=chat_backend,
        chat_eligible=is_live,
        downloads=downloads,
        likes=likes,
        last_modified=last_modified,
        hf_url=f"https://huggingface.co/{model_id}",
    )
