from ailiance_demo.models.dataset import DatasetSummary, DatasetDetail, DatasetSample


def test_dataset_summary_minimal_fields() -> None:
    d = DatasetSummary(
        domain="electronics-hw",
        name="oshwa-curated",
        n_rows=4321,
        license="CERN-OHL-S-2.0",
        hf_dataset_id="Ailiance-fr/oshwa",
        download_date="2026-04-26",
        size_bytes=14_222_345,
    )
    assert d.domain == "electronics-hw"
    assert d.n_rows == 4321
    assert d.size_mb == round(14_222_345 / (1024 * 1024), 2)


def test_dataset_detail_inherits_summary_and_adds_samples() -> None:
    detail = DatasetDetail(
        domain="electronics-hw",
        name="oshwa-curated",
        n_rows=10,
        license="MIT",
        hf_dataset_id="x/y",
        download_date="2026-04-26",
        size_bytes=10_000,
        samples=[
            DatasetSample(
                user="What is a pull-up resistor?",
                assistant="A resistor pulling a line to VCC...",
            )
        ],
    )
    assert len(detail.samples) == 1
    assert detail.samples[0].user.startswith("What")
