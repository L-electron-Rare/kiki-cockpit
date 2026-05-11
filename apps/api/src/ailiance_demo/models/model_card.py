"""Pydantic schemas for model cards exposed to the public API."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ModelStatus(str, Enum):
    FEATURED = "featured"
    PRODUCTION = "production"
    ALPHA = "alpha"
    EXPERIMENTAL = "experimental"
    DEPRECATED = "deprecated"


class ChatBackend(str, Enum):
    AILIANCE_LIVE = "ailiance_live"  # served by gateway :9200
    HF_EXTERNAL = "hf_external"    # deep-link to huggingface.co
    NOT_AVAILABLE = "not_available"


class ModelKind(str, Enum):
    """Training provenance of the model.

    base       — original foundation model trained from scratch (or imported
                 unchanged from upstream).
    fine_tuned — full fine-tune (all weights updated) of an upstream base.
    lora       — LoRA / PEFT adapter on top of a base; weights = adapter only.
    quantized  — re-quantisation of an upstream model (no training).
    distilled  — distillation of a larger teacher.
    merged     — weight-merge of two or more checkpoints.
    """
    BASE = "base"
    FINE_TUNED = "fine_tuned"
    LORA = "lora"
    QUANTIZED = "quantized"
    DISTILLED = "distilled"
    MERGED = "merged"
    UNKNOWN = "unknown"


class DatasetRef(BaseModel):
    hf_dataset_id: str
    license: str | None = None
    n_examples: int | None = None
    used_for: str | None = None


class ModelCard(BaseModel):
    """Listing-level summary of a model."""
    id: str = Field(description="HF-style id, owner/name, e.g. 'Ailiance-fr/micro-kiki-v3'")
    owner: str
    name: str
    display_name: str
    description: str | None = None
    base_model: str | None = None
    domain: str | None = None
    status: ModelStatus
    chat_backend: ChatBackend
    chat_eligible: bool
    downloads: int = 0
    likes: int = 0
    last_modified: datetime | None = None
    hf_url: str
    featured_rank: int | None = None
    featured_headline: str | None = None
    top_eval_score: float | None = None
    top_eval_benchmark: str | None = None

    # Hardware / footprint metadata. Populated from HF API (siblings sum,
    # safetensors.total, gguf.total) for HF models and from _LIVE_DETAILS for
    # live workers. All optional — older clients ignore them.
    parameters: int | None = None
    disk_size_bytes: int | None = None
    memory_gb: float | None = None
    quantization: str | None = None
    host: str | None = None
    architecture: str | None = None
    license: str | None = None
    kind: ModelKind = ModelKind.UNKNOWN


class ModelDetail(ModelCard):
    """Full detail page payload."""
    long_description: str | None = None
    datasets: list[DatasetRef] = Field(default_factory=list)
    training_config: dict = Field(default_factory=dict)
    hardware: str | None = None
    github_url: str | None = None
    deprecated_note: str | None = None
    superseded_by: str | None = None
