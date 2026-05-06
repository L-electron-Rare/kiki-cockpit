"""Public models listing + detail."""
from fastapi import APIRouter, Depends, HTTPException, Query

from ailiance_demo.deps import get_hf_cache
from ailiance_demo.models import ModelCard
from ailiance_demo.models.model_card import ChatBackend, ModelKind, ModelStatus
from ailiance_demo.services.chat_proxy import ALIAS_TO_GATEWAY_MODEL
from ailiance_demo.services.hf_cache import HFCache

router = APIRouter(prefix="/api/public", tags=["public"])


# Synthetic cards for the live ailiance gateway models. They are not on HF, so
# the HF cache never produces them — but the chat proxy can route to them.
# Adding/removing entries in chat_proxy.ALIAS_TO_GATEWAY_MODEL is the single
# source of truth for chat eligibility, including this listing.
# Per-alias live model details. Centralised here so /models, /models/{id} and
# any future widget read the same source of truth. base_model = base
# architecture; domain = primary use case; description includes hardware host
# + memory footprint so users can pick the right model.
# 1 GiB constant for size annotations
_GIB = 1024**3

_LIVE_DETAILS: dict[str, dict] = {
    "ailiance/apertus-70b": {
        "display_name": "Apertus 70B",
        "base_model": "Apertus 70B",
        "domain": "general",
        "description": (
            "Swiss-stack 70B foundation model — fluent FR/DE/IT/EN. "
            "Runs on Mac Studio M3 Ultra."
        ),
        "headline": "70B params · MLX 8-bit · Mac Studio M3 Ultra",
        "parameters": 70_000_000_000,
        "disk_size_bytes": 70 * _GIB,
        "memory_gb": 75.0,
        "quantization": "MLX 8-bit",
        "host": "studio (Mac Studio M3 Ultra)",
        "architecture": "mlx",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/devstral-24b": {
        "display_name": "Devstral 24B",
        "base_model": "Mistral Small 3.1",
        "domain": "code",
        "description": (
            "Mistral-AI Devstral 24B — code-focused. "
            "Runs on Mac mini M1."
        ),
        "headline": "24B params · MLX 4-bit · Mac mini M1",
        "parameters": 24_000_000_000,
        "disk_size_bytes": 13 * _GIB,
        "memory_gb": 14.0,
        "quantization": "MLX 4-bit",
        "host": "macm1 (Mac mini M1)",
        "architecture": "mlx",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/eurollm-22b": {
        "display_name": "EuroLLM 22B",
        "base_model": "EuroLLM 22B",
        "domain": "multilingual",
        "description": (
            "EuroLLM 22B — multilingual EU coverage (24 official languages). "
            "Runs on Mac Studio M3 Ultra."
        ),
        "headline": "22B params · MLX 8-bit · Mac Studio M3 Ultra",
        "parameters": 22_000_000_000,
        "disk_size_bytes": 22 * _GIB,
        "memory_gb": 24.0,
        "quantization": "MLX 8-bit",
        "host": "studio (Mac Studio M3 Ultra)",
        "architecture": "mlx",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/qwen3-next-80b-a3b-instruct": {
        "display_name": "Qwen3-Next 80B A3B Instruct",
        "base_model": "Qwen/Qwen3-Next-80B-A3B-Instruct",
        "domain": "reasoning",
        "description": (
            "Qwen3-Next 80B sparse MoE (3B active per token) — Q4_K_M GGUF "
            "served by llama.cpp on kxkm-ai (NVIDIA RTX 4090 24 GB). MoE "
            "expert offload: attention layers on GPU, ffn experts in CPU "
            "RAM via --override-tensor. Reachable from the gateway via "
            "autossh tunnel (electron-server:8002 → kxkm-ai:18888)."
        ),
        "headline": "80B MoE / 3B active · Q4_K_M · RTX 4090 + RAM offload",
        "parameters": 80_000_000_000,
        "disk_size_bytes": 48_410_988_384,
        "memory_gb": 50.0,  # ~6 GB VRAM (attention + KV q8_0) + ~44 GB RAM (experts)
        "quantization": "Q4_K_M",
        "host": "kxkm-ai (NVIDIA RTX 4090 24 GB + 64 GB RAM)",
        "architecture": "gguf",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/gemma3-4b": {
        "display_name": "Gemma 3 4B IT",
        "base_model": "google/gemma-3-4b-it",
        "domain": "general",
        "description": (
            "Google DeepMind Gemma 3 4B Instruction-Tuned — small, fast, "
            "multilingual. Runs on tower (NVIDIA Quadro P2000, 5 GB VRAM)."
        ),
        "headline": "4B params · BF16 · NVIDIA Quadro P2000",
        "parameters": 4_000_000_000,
        "disk_size_bytes": 8 * _GIB,
        "memory_gb": 8.0,
        "quantization": "BF16",
        "host": "tower (NVIDIA Quadro P2000 5 GB)",
        "architecture": "transformers",
        "license": "gemma-terms",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/auto": {
        "display_name": "Auto-router",
        "base_model": "MiniLM L6 v2 + 2-layer MLP",
        "domain": "router",
        "description": (
            "Domain router classifies your prompt over 32 domains and forwards "
            "to the best worker (Apertus 70B / Devstral 24B / EuroLLM 22B / "
            "Gemma 3 4B). Trained on the AI-Act-traceable clean corpus "
            "(router-v6, 2026-05-06). Decision shown above each reply."
        ),
        "headline": "MiniLM 384d · 32 domains · top1=87.7 % top3=98 %",
        "parameters": 22_700_000,  # MiniLM L6 v2 ≈ 22.7M
        "disk_size_bytes": 90_000_000 + 432_000,  # ST model + safetensors head
        "memory_gb": 0.2,
        "quantization": "FP32",
        "host": "electron-server (gateway-side, CPU)",
        "architecture": "safetensors",
        "license": "apache-2.0",
        "kind": ModelKind.FINE_TUNED,
    },
}


def _live_cards() -> list[ModelCard]:
    cards: list[ModelCard] = []
    for alias in ALIAS_TO_GATEWAY_MODEL:
        owner, name = alias.split("/", 1)
        details = _LIVE_DETAILS.get(alias, {})
        cards.append(
            ModelCard(
                id=alias,
                owner=owner,
                name=name,
                display_name=details.get("display_name", name),
                description=details.get("description"),
                base_model=details.get("base_model"),
                domain=details.get("domain"),
                status=ModelStatus.PRODUCTION,
                chat_backend=ChatBackend.AILIANCE_LIVE,
                chat_eligible=True,
                featured_rank=0,
                featured_headline=details.get("headline"),
                hf_url=f"https://huggingface.co/{alias}",
                parameters=details.get("parameters"),
                disk_size_bytes=details.get("disk_size_bytes"),
                memory_gb=details.get("memory_gb"),
                quantization=details.get("quantization"),
                host=details.get("host"),
                architecture=details.get("architecture"),
                license=details.get("license"),
                kind=details.get("kind", ModelKind.UNKNOWN),
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
