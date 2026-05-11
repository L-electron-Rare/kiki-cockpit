"""Schema sanity tests."""
from datetime import datetime, UTC

from ailiance_demo.models import ChatBackend, EvalResult, ModelCard, ModelStatus


def test_model_card_minimal_fields() -> None:
    card = ModelCard(
        id="clemsail/micro-kiki-v3",
        owner="clemsail",
        name="micro-kiki-v3",
        display_name="Micro-Ailiance v3",
        status=ModelStatus.FEATURED,
        chat_backend=ChatBackend.HF_EXTERNAL,
        chat_eligible=False,
        hf_url="https://huggingface.co/clemsail/micro-kiki-v3",
    )
    assert card.id == "clemsail/micro-kiki-v3"
    assert card.downloads == 0
    assert card.chat_eligible is False


def test_eval_result_roundtrip() -> None:
    payload = {
        "model_id": "clemsail/micro-kiki-v3",
        "benchmark": "HumanEval+",
        "metric": "pass@1",
        "score": 0.78,
        "timestamp": "2026-04-30T12:00:00Z",
    }
    result = EvalResult.model_validate(payload)
    assert result.score == 0.78
    assert result.timestamp == datetime(2026, 4, 30, 12, 0, 0, tzinfo=UTC)
