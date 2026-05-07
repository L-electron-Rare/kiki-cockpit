from ailiance_demo.config import settings
from ailiance_demo.deps import get_datasets_service
from ailiance_demo.services.datasets import DatasetsService


def test_get_datasets_service_returns_singleton() -> None:
    svc1 = get_datasets_service()
    svc2 = get_datasets_service()
    assert isinstance(svc1, DatasetsService)
    assert svc1 is svc2  # cached


def test_settings_has_datasets_root() -> None:
    assert hasattr(settings, "datasets_root")
    assert isinstance(settings.datasets_root, list)
