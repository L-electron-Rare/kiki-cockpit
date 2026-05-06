"""HuggingFace API sync — fetch model metadata, cache in memory."""
from __future__ import annotations

import asyncio
from datetime import datetime

import structlog
import httpx

from ailiance_demo.models import ChatBackend, ModelCard, ModelKind, ModelStatus

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

    # Listing endpoint omits per-file sizes, safetensors, gguf and cardData.
    # Enrich in parallel with /api/models/{id}?blobs=true so size + parameter
    # count actually populate. ~30 models × 1 request, fan-out keeps this fast.
    enriched = await _enrich_models(client, data)
    return enriched


async def _enrich_models(
    client: httpx.AsyncClient, models: list[dict]
) -> list[dict]:
    async def fetch_one(m: dict) -> dict:
        model_id = m.get("id") or m.get("modelId")
        if not model_id:
            return m
        try:
            r = await client.get(
                f"/api/models/{model_id}",
                params={"blobs": "true"},
                timeout=httpx.Timeout(10.0, connect=5.0),
            )
            if r.status_code == 200:
                detail = r.json()
                # Merge: detail wins for the rich blocks we care about; the
                # listing provides downloads/likes which are already current.
                merged = dict(m)
                for k in (
                    "siblings",
                    "safetensors",
                    "gguf",
                    "cardData",
                    "tags",
                    "library_name",
                ):
                    if k in detail:
                        merged[k] = detail[k]
                return merged
        except (httpx.HTTPError, ValueError):
            pass
        return m

    return await asyncio.gather(*(fetch_one(m) for m in models))


def to_model_card(raw: dict, ailiance_aliases: set[str]) -> ModelCard:
    """Map a raw HF API model JSON object to a ModelCard.

    ailiance_aliases: model IDs that should be marked chat-eligible (Live stack).
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

    is_live = model_id in ailiance_aliases
    chat_backend = ChatBackend.AILIANCE_LIVE if is_live else ChatBackend.HF_EXTERNAL

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
    is_lora_adapter = False
    if not base_model:
        for t in tags:
            if isinstance(t, str) and t.startswith("base_model:"):
                if ":adapter:" in t:
                    is_lora_adapter = True
                    base_model = t.split(":adapter:", 1)[1]
                    break
                if not base_model:
                    base_model = t.split(":", 1)[1]
    else:
        # base_model present in cardData → check tags for adapter signal too.
        for t in tags:
            if isinstance(t, str) and ":adapter:" in t:
                is_lora_adapter = True
                break

    # Provenance / training kind. Order of precedence: explicit lora/peft tag,
    # adapter base_model tag, gguf-only quantisation, fine-tune (has base),
    # else base.
    kind = ModelKind.UNKNOWN
    if is_lora_adapter or "lora" in tag_set or "peft" in tag_set or "adapter" in tag_set:
        kind = ModelKind.LORA
    elif "merged" in tag_set or "merge" in tag_set:
        kind = ModelKind.MERGED
    elif "distilled" in tag_set or "distillation" in tag_set:
        kind = ModelKind.DISTILLED
    elif "gguf" in tag_set and base_model:
        kind = ModelKind.QUANTIZED
    elif base_model:
        kind = ModelKind.FINE_TUNED
    elif sf or "safetensors" in tag_set or architecture in {"safetensors"}:
        kind = ModelKind.BASE

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
        kind=kind,
    )
