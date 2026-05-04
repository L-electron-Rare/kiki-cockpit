"""Tests for log_tail mlx_lm parser."""
from kiki_cockpit.services.log_tail import parse_line


def test_parses_train_iter_line() -> None:
    line = "Iter 100: Train loss 0.612, Learning Rate 1.0e-04, It/sec 0.45, Tokens/sec 1024"
    metric = parse_line(line)
    assert metric is not None
    assert metric.iter == 100
    assert metric.split == "train"
    assert metric.loss == 0.612
    assert metric.lr == 1.0e-04


def test_parses_val_iter_line() -> None:
    line = "Iter 200: Val loss 0.532, Val took 22.1s"
    metric = parse_line(line)
    assert metric is not None
    assert metric.iter == 200
    assert metric.split == "val"
    assert metric.loss == 0.532
    assert metric.took_s == 22.1


def test_returns_none_for_non_iter_lines() -> None:
    assert parse_line("Loading config from foo.yaml") is None
    assert parse_line("") is None
    assert parse_line("Trainable params 16.78M") is None
