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
        # full=true exposes siblings, safetensors and gguf blocks needed for
        # parameter and disk-size extraction. blobs=true adds per-file sizes.
        # HF caches these, so the cost stays roughly the same.
        response = await client.get(
            "/api/models",
            params={"author": owner, "limit": limit, "full": "true", "blobs": "true"},
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

    # Aggregated footprint metadata. Sources tried in order:
    # - siblings[].size  → total disk size of the repo (includes README, etc.)
    # - safetensors.total or gguf.total  → parameter count
    # - gguf.totalFileSize  → fallback size when siblings are pointer files
    # - cardData.license   → SPDX-style license string
    # - tags  → format detection (gguf, safetensors, lora, mlx)
    siblings = raw.get("siblings") or []
    disk_size_bytes: int | None = None
    if siblings:
        accum = 0
        any_size = False
        for s in siblings:
            sz = s.get("size")
            if sz:
                accum += int(sz)
                any_size = True
        disk_size_bytes = accum if any_size else None

    sf = raw.get("safetensors") or {}
    gguf = raw.get("gguf") or {}
    parameters = sf.get("total") or gguf.get("total")
    if disk_size_bytes is None and gguf.get("totalFileSize"):
        disk_size_bytes = int(gguf["totalFileSize"])

    card_data = raw.get("cardData") or {}
    license_str = card_data.get("license")

    tags = raw.get("tags") or []
    tag_set = {t.lower() for t in tags if isinstance(t, str)}
    if "gguf" in tag_set:
        architecture = "gguf"
    elif "mlx" in tag_set:
        architecture = "mlx"
    elif "lora" in tag_set:
        architecture = "lora"
    elif sf:
        architecture = "safetensors"
    else:
        architecture = None

    base_model = card_data.get("base_model")
    if isinstance(base_model, list):
        base_model = base_model[0] if base_model else None
    if not base_model:
        for t in tags:
            if isinstance(t, str) and t.startswith("base_model:") and ":adapter" not in t:
                base_model = t.split(":", 1)[1]
                break

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
        parameters=parameters,
        disk_size_bytes=disk_size_bytes,
        architecture=architecture,
        license=license_str,
        base_model=base_model,
    )
