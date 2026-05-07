from ailiance_demo.models.benchmark import BenchmarkRun

_VALID_KWARGS = {
    "run_id": "devstral-base-humanevalplus",
    "benchmark": "HumanEval+",
    "model": "ailiance/devstral-24b",
    "adapter": "(base)",
    "score": 82.90,
    "score_unit": "%",
    "delta_vs_base": 0.0,
    "n_samples": 164,
    "date": "2026-05-04",
    "host": "kx6tm-23 Linux",
    "verdict": "reference",
    "notes": "HE base 87.20% / HE+ 82.90% (EvalPlus Linux)",
}


def test_instantiate_benchmark_run() -> None:
    run = BenchmarkRun(**_VALID_KWARGS)
    assert run.run_id == "devstral-base-humanevalplus"
    assert run.score == 82.90
    assert run.n_samples == 164


def test_model_dump_roundtrip() -> None:
    run = BenchmarkRun(**_VALID_KWARGS)
    dumped = run.model_dump()
    restored = BenchmarkRun(**dumped)
    assert restored == run
