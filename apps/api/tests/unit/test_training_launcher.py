import yaml

from ailiance_demo.services.training_launcher import (
    LaunchRequest,
    TrainingLauncher,
    UnknownModelError,
)


def test_launch_request_minimum_fields() -> None:
    req = LaunchRequest(
        base_model="ailiance/gemma4-e4b-curriculum",
        dataset_domain="electronics-hw",
    )
    assert req.iters == 2000  # default
    assert req.lora_rank == 32
    assert req.learning_rate == 5e-6


def test_render_yaml_for_known_model() -> None:
    launcher = TrainingLauncher(host_for_model={"ailiance/gemma4-e4b-curriculum": "macm1"})
    req = LaunchRequest(
        base_model="ailiance/gemma4-e4b-curriculum",
        dataset_domain="electronics-hw",
        iters=500,
        lora_rank=16,
        learning_rate=1e-5,
    )
    cfg = launcher.render_yaml(req)
    parsed = yaml.safe_load(cfg)
    assert parsed["data"].endswith("/electronics-hw")
    assert parsed["adapter_path"].endswith("/electronics-hw")
    assert parsed["lora_parameters"]["rank"] == 16
    assert parsed["learning_rate"] == 1e-5
    assert parsed["iters"] == 500


def test_render_yaml_unknown_model_raises() -> None:
    launcher = TrainingLauncher(host_for_model={})
    req = LaunchRequest(
        base_model="ailiance/unknown",
        dataset_domain="x",
    )
    try:
        launcher.render_yaml(req)
    except UnknownModelError as exc:
        assert "ailiance/unknown" in str(exc)
    else:
        raise AssertionError("expected UnknownModelError")


def test_dispatch_records_invocation_for_test_double() -> None:
    calls: list[tuple[str, str, str]] = []

    def fake_dispatcher(host: str, run_id: str, yaml_text: str) -> None:
        calls.append((host, run_id, yaml_text))

    launcher = TrainingLauncher(
        host_for_model={"ailiance/gemma4-e4b-curriculum": "macm1"},
        dispatcher=fake_dispatcher,
    )
    req = LaunchRequest(
        base_model="ailiance/gemma4-e4b-curriculum",
        dataset_domain="electronics-hw",
    )
    info = launcher.launch(req)

    assert info.host == "macm1"
    assert info.run_id.startswith("electronics-hw-")
    assert len(calls) == 1
    assert calls[0][0] == "macm1"
    assert calls[0][1] == info.run_id
