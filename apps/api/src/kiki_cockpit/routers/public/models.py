"""Public models listing + detail."""
from fastapi import APIRouter, Depends, HTTPException, Query

from kiki_cockpit.deps import get_hf_cache
from kiki_cockpit.models import ModelCard
from kiki_cockpit.models.model_card import ChatBackend, ModelStatus
from kiki_cockpit.services.chat_proxy import ALIAS_TO_GATEWAY_MODEL
from kiki_cockpit.services.hf_cache import HFCache

router = APIRouter(prefix="/api/public", tags=["public"])


# Synthetic cards for the live eu-kiki gateway models. They are not on HF, so
# the HF cache never produces them — but the chat proxy can route to them.
# Adding/removing entries in chat_proxy.ALIAS_TO_GATEWAY_MODEL is the single
# source of truth for chat eligibility, including this listing.
_LIVE_DISPLAY = {
    "eu-kiki/apertus-70b": (
        "Apertus 70B (live)",
        "Swiss-stack 70B foundation model — fluent FR/DE/IT/EN.",
    ),
    "eu-kiki/devstral-24b": (
        "Devstral 24B (live)",
        "Mistral-AI Devstral 24B — code-focused, MLX 4-bit.",
    ),
    "eu-kiki/eurollm-22b": (
        "EuroLLM 22B (live)",
        "EuroLLM 22B — multilingual EU coverage.",
    ),
    "eu-kiki/qwen-35b-a3b": (
        "Qwen3.5 35B A3B (live)",
        "Qwen3.5 35B Active-3B MoE Q3 — reasoning model on kxkm-ai.",
    ),
    "eu-kiki/auto": (
        "Auto-router (MiniLM)",
        "Domain router classifies your prompt and forwards to the best worker. "
        "Decision is shown above each reply.",
    ),
}


def _live_cards() -> list[ModelCard]:
    cards: list[ModelCard] = []
    for alias in ALIAS_TO_GATEWAY_MODEL:
        owner, name = alias.split("/", 1)
        display, description = _LIVE_DISPLAY.get(alias, (name, None))
        cards.append(
            ModelCard(
                id=alias,
                owner=owner,
                name=name,
                display_name=display,
                description=description,
                status=ModelStatus.PRODUCTION,
                chat_backend=ChatBackend.EU_KIKI_LIVE,
                chat_eligible=True,
                hf_url=f"https://huggingface.co/{alias}",
            )
        )
    return cards


@router.get("/models", response_model=list[ModelCard])
def list_models(
    cache: HFCache = Depends(get_hf_cache),
    domain: str | None = Query(default=None),
    base_model: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[ModelCard]:
    # Live cards first so the SPA surfaces chat-eligible models prominently.
    cards = _live_cards() + cache.list_cards()
    if domain:
        cards = [c for c in cards if c.domain == domain]
    if base_model:
        cards = [c for c in cards if c.base_model == base_model]
    if status:
        cards = [c for c in cards if c.status.value == status]
    return cards


@router.get("/models/{owner}/{name}", response_model=ModelCard)
def get_model(owner: str, name: str, cache: HFCache = Depends(get_hf_cache)) -> ModelCard:
    model_id = f"{owner}/{name}"
    if model_id in ALIAS_TO_GATEWAY_MODEL:
        return next(c for c in _live_cards() if c.id == model_id)
    card = cache.get_card(model_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return card
