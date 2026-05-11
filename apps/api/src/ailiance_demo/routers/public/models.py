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
    "ailiance/mistral-medium-3.5-128b": {
        "display_name": "Mistral Medium 3.5 128B",
        "base_model": "Mistral Medium 3.5 128B",
        "domain": "general",
        "description": (
            "Mistral AI flagship 128B — reasoning, code, vision, agents in a "
            "single model (absorbs Devstral 2 + Magistral + Pixtral). "
            "Released April 29 2026 under Modified MIT — free commercial use "
            "for individuals, startups, mid-market, and universities; "
            "high-revenue enterprises require Mistral's paid API. "
            "262 k context window. Runs on Mac Studio M3 Ultra."
        ),
        "headline": "128B params · MLX Q8 · 262k context · Mac Studio M3 Ultra",
        "parameters": 128_000_000_000,
        "disk_size_bytes": 124 * _GIB,
        "memory_gb": 130.0,
        "quantization": "MLX Q8",
        "host": "studio (Mac Studio M3 Ultra)",
        "architecture": "mlx",
        "license": "modified-mit",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/gemma4-e4b-curriculum": {
        "display_name": "Gemma 4 E4B + ailiance curriculum LoRA",
        "base_model": "google/gemma-4-E4B-it",
        "domain": "general",
        "description": (
            "Google Gemma 4 E4B Instruction-Tuned avec adapter LoRA fine-tuné "
            "en curriculum 4 phases (seq 512 → 1024 → 2048 → 3072) sur le "
            "dataset ailiance (~82k conversations, electronics + code). "
            "Test loss 2.094 (perplexity 8.12). Tourne sur Mac mini M1."
        ),
        "headline": "E4B · MLX 4-bit + LoRA · Mac mini M1",
        "parameters": 4_000_000_000,
        "disk_size_bytes": 4 * _GIB,
        "memory_gb": 12.0,
        "quantization": "MLX 4-bit + LoRA",
        "host": "macm1 (Mac mini M1)",
        "architecture": "mlx",
        "license": "gemma-terms",
        "kind": ModelKind.FINE_TUNED,
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
        "base_model": "Jina v3 1024d embeddings + 2-layer MLP",
        "domain": "router",
        "description": (
            "Domain router classifies your prompt over 32 domains and forwards "
            "to the best specialist. Trained on the AI-Act-traceable clean "
            "corpus (router v0.3, 2026-05-11). Hardware domains (kicad / spice / "
            "stm32 / emc / embedded / power) route to the mascarade LoRA "
            "specialists with a sandboxed Docker validator. Generalist domains "
            "(math, code, multilingual, raisonnement) route directly. The "
            "decision is shown above each reply in the playground."
        ),
        "headline": "Jina v3 1024d · 32 domains · chain v0.3 · iact-bench validator",
        "parameters": 137_000_000,  # Jina v3 ~137M
        "disk_size_bytes": 550_000_000,
        "memory_gb": 1.2,
        "quantization": "FP32",
        "host": "electron-server (gateway-side, CPU)",
        "architecture": "safetensors",
        "license": "apache-2.0",
        "kind": ModelKind.FINE_TUNED,
    },
    "ailiance/granite-30b": {
        "display_name": "Granite 4.1 30B Instruct",
        "base_model": "ibm-granite/granite-4.1-30B-instruct",
        "domain": "code",
        "description": (
            "IBM Granite 4.1 30B Instruct — code-first instruction-tuned "
            "open model with strong enterprise SQL / RAG / tool-use scores. "
            "Q4_K_M GGUF served by llama.cpp on kxkm-ai RTX 4090 via autossh "
            "tunnel (electron-server :8003)."
        ),
        "headline": "30B · Q4_K_M · RTX 4090 (kxkm-ai)",
        "parameters": 30_000_000_000,
        "disk_size_bytes": 18 * _GIB,
        "memory_gb": 20.0,
        "quantization": "Q4_K_M",
        "host": "kxkm-ai (NVIDIA RTX 4090, autossh tunnel)",
        "architecture": "gguf",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/ministral-14b": {
        "display_name": "Ministral 3 14B Instruct",
        "base_model": "mistralai/Ministral-3-14B-Instruct-2512",
        "domain": "general",
        "description": (
            "Mistral Ministral 3 14B Instruct — small, fast generalist for "
            "FR/EN chat. MLX 4-bit on macM1 :8502."
        ),
        "headline": "14B · MLX 4-bit · macM1",
        "parameters": 14_000_000_000,
        "disk_size_bytes": 8 * _GIB,
        "memory_gb": 9.0,
        "quantization": "MLX 4-bit",
        "host": "macm1 (Apple M1)",
        "architecture": "mlx",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
    "ailiance/ministral-14b-reasoning": {
        "display_name": "Ministral 3 14B Reasoning",
        "base_model": "mistralai/Ministral-3-14B-Reasoning-2512",
        "domain": "reasoning",
        "description": (
            "Ministral 3 14B with reasoning fine-tune — chain-of-thought "
            "responses for math and complex problem-solving. MLX 4-bit on macM1."
        ),
        "headline": "14B reasoning · MLX 4-bit · macM1",
        "parameters": 14_000_000_000,
        "disk_size_bytes": 8 * _GIB,
        "memory_gb": 9.0,
        "quantization": "MLX 4-bit",
        "host": "macm1 (Apple M1)",
        "architecture": "mlx",
        "license": "apache-2.0",
        "kind": ModelKind.QUANTIZED,
    },
}


# 12 mascarade LoRA specialists — one card, twelve adapters. Each entry lists
# its domain, blurb, sandboxed validator(s), and approximate training steps.
# The cockpit surfaces them collectively in /models/ailiance/mascarade.
MASCARADE_LORAS: list[dict] = [
    {"name": "kicad", "domain": "kicad", "steps": 522,
     "blurb": "KiCad schematic & PCB DSL — s-expression .kicad_sch and .kicad_pcb generation",
     "validator": "kicad-cli ERC + DRC sandboxed (--network=none)"},
    {"name": "spice", "domain": "spice", "steps": 412,
     "blurb": "SPICE netlist + simulation — ngspice / Xyce / LTspice idiomatic input",
     "validator": "ngspice batch --no-spiceinit"},
    {"name": "stm32", "domain": "stm32", "steps": 350,
     "blurb": "STM32 / ARM Cortex-M embedded — HAL/LL, FreeRTOS, peripheral init",
     "validator": "arm-none-eabi-gcc + cppcheck"},
    {"name": "emc", "domain": "emc", "steps": 280,
     "blurb": "EMC / EMI compliance — CISPR / FCC limits, filter & decoupling design",
     "validator": "rule-based EMC checker (compatibility report)"},
    {"name": "embedded", "domain": "embedded", "steps": 100,
     "blurb": "Generic embedded C/C++ — bare-metal drivers, MMIO, ISR, DMA",
     "validator": "g++ + compile + cppcheck"},
    {"name": "platformio", "domain": "platformio", "steps": 2,
     "blurb": "PlatformIO / Arduino — board configs, library targets, build pipeline",
     "validator": "pio run --target lint"},
    {"name": "freecad", "domain": "freecad", "steps": 2,
     "blurb": "FreeCAD scripting — Python macros for parametric modelling & 3D MCAD",
     "validator": "freecadcmd headless script run"},
    {"name": "dsp", "domain": "dsp", "steps": 2,
     "blurb": "DSP / signal processing — IIR/FIR, FFT, audio + RF analyse",
     "validator": "numpy + scipy validator"},
    {"name": "iot", "domain": "iot", "steps": 2,
     "blurb": "IoT / connectivity — MQTT, BLE, LoRa, ESP-IDF, Zephyr",
     "validator": "ESP-IDF idf.py build"},
    {"name": "power", "domain": "power", "steps": 2,
     "blurb": "Power electronics — DC/DC, converters, motor drives, battery management",
     "validator": "ngspice transient + steady-state"},
    {"name": "components-review", "domain": "components-review", "steps": 200,
     "blurb": "BOM / parts review — recommends alternatives, flags obsolescence, sourcing",
     "validator": "OctoPart / Digi-Key API cross-check"},
    {"name": "coder", "domain": "code", "steps": 300,
     "blurb": "Polyglot coder — Python, Rust, TypeScript, Go with iact-bench code validators",
     "validator": "tsc, ruff, rustc, go vet"},
]


_LIVE_DETAILS["ailiance/mascarade"] = {
    "display_name": "Mascarade · 12 LoRAs spécialistes",
    "base_model": "ailiance/Qwen3-4B + LoRA",
    "domain": "hardware-specialists",
    "description": (
        "Famille de 12 adaptateurs LoRA fine-tunés (r=16, α=32) sur le "
        "modèle de base ailiance/Qwen3-4B. Chacun est servi par Ollama sur "
        "Tower (NVIDIA Quadro P2000) via le tunnel autossh "
        "electron-server :8004 → tower:11434. L'auto-router classifie le "
        "domaine du prompt et délègue au spécialiste correspondant, puis "
        "fait passer la sortie dans un validator Docker sandboxé. La fiche "
        "détaillée liste les 12 spécialistes avec leur domaine, leur "
        "nombre de steps d'entraînement et leur validator dédié."
    ),
    "headline": "ailiance/Qwen3-4B + 12 LoRAs · Tower Ollama :8004 · validator sandbox",
    "parameters": 4_000_000_000,
    "disk_size_bytes": 12 * 3 * _GIB,  # 12 LoRAs × ~3 GB GGUF each
    "memory_gb": 3.5,
    "quantization": "Q4_K_M LoRA",
    "host": "tower (NVIDIA Quadro P2000 5 GB)",
    "architecture": "gguf",
    "license": "apache-2.0",
    "kind": ModelKind.LORA,
}


# The 12 mascarade-* gateway aliases stay in ALIAS_TO_GATEWAY_MODEL so the
# gateway router can still address each specialist directly, but the public
# /models catalog folds them into a single "ailiance/mascarade" card.
_MASCARADE_HIDDEN = {f"ailiance/mascarade-{lo['name']}" for lo in MASCARADE_LORAS}


def _live_cards() -> list[ModelCard]:
    cards: list[ModelCard] = []
    for alias in ALIAS_TO_GATEWAY_MODEL:
        if alias in _MASCARADE_HIDDEN:
            continue  # collapsed into the single ailiance/mascarade card below
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

    # Append the consolidated mascarade card (not in ALIAS_TO_GATEWAY_MODEL —
    # it represents the LoRA family, individual specialists are routed
    # transparently by the auto-router).
    md = _LIVE_DETAILS["ailiance/mascarade"]
    cards.append(
        ModelCard(
            id="ailiance/mascarade",
            owner="ailiance",
            name="mascarade",
            display_name=md["display_name"],
            description=md["description"],
            base_model=md["base_model"],
            domain=md["domain"],
            status=ModelStatus.PRODUCTION,
            chat_backend=ChatBackend.AILIANCE_LIVE,
            chat_eligible=True,
            featured_rank=0,
            featured_headline=md["headline"],
            hf_url="https://huggingface.co/Ailiance-fr",
            parameters=md["parameters"],
            disk_size_bytes=md["disk_size_bytes"],
            memory_gb=md["memory_gb"],
            quantization=md["quantization"],
            host=md["host"],
            architecture=md["architecture"],
            license=md["license"],
            kind=md["kind"],
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
    if model_id == "ailiance/mascarade" or model_id in ALIAS_TO_GATEWAY_MODEL:
        return next(c for c in _live_cards() if c.id == model_id)
    card = cache.get_card(model_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return card


@router.get("/models/ailiance/mascarade/loras")
def mascarade_loras() -> list[dict]:
    """List the 12 LoRA specialists under the mascarade family."""
    return MASCARADE_LORAS
