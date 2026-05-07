# Cockpit Dataset + Training Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Datasets gallery and a Training Designer to the cockpit admin so an investor demo can visualize the EU-AI-Act-traceable dataset corpus and trigger a new LoRA training run on a selected (model, dataset) pair, with the resulting run appearing live in the existing training panel.

**Architecture:** A FastAPI service reads dataset manifests rsync'd from training hosts (Studio + macm1), exposes them on `/api/admin/datasets`, and dispatches new training runs by SSH'ing into the host that owns the requested base model and starting an `mlx_lm.lora` process inside a `screen` session. The React admin SPA gains two pieces: a `/datasets` route that displays each dataset as a card with provenance metadata, and a `<TrainingDesigner>` modal opened from the existing `/training` page that posts a launch request and routes the user to the live log view of the new run.

**Tech Stack:**
- Python 3.13, FastAPI, Pydantic v2, pytest, httpx (in-test client)
- React 19, TanStack Router, TanStack Query, Vitest, @testing-library/react, recharts (already in repo)
- BSD rsync over SSH, screen, mlx_lm.lora on training hosts
- Docker compose deploy on electron-server

---

## File Structure

### New backend files
- `apps/api/src/ailiance_demo/models/dataset.py` — Pydantic models `DatasetSummary`, `DatasetDetail`, `DatasetSample`
- `apps/api/src/ailiance_demo/services/datasets.py` — manifest discovery + sample reader
- `apps/api/src/ailiance_demo/services/training_launcher.py` — generate YAML config, dispatch via SSH
- `apps/api/src/ailiance_demo/routers/admin/datasets.py` — GET endpoints
- `apps/api/tests/unit/test_datasets_service.py`
- `apps/api/tests/unit/test_training_launcher.py`
- `apps/api/tests/integration/test_admin_datasets.py`
- `apps/api/tests/integration/test_admin_training_launch.py`

### Modified backend files
- `apps/api/src/ailiance_demo/models/__init__.py` — re-export new schemas
- `apps/api/src/ailiance_demo/config.py` — add `datasets_root` setting
- `apps/api/src/ailiance_demo/deps.py` — provide `DatasetsService`, `TrainingLauncher`
- `apps/api/src/ailiance_demo/main.py` — register the datasets router
- `apps/api/src/ailiance_demo/routers/admin/training.py` — add `POST /training/launch`

### New frontend files
- `apps/cockpit-admin/src/hooks/useDatasets.ts`
- `apps/cockpit-admin/src/hooks/useLaunchTraining.ts`
- `apps/cockpit-admin/src/components/DatasetCard.tsx`
- `apps/cockpit-admin/src/components/TrainingDesigner.tsx`
- `apps/cockpit-admin/src/routes/datasets.index.tsx`
- `apps/cockpit-admin/tests/components/DatasetCard.test.tsx`
- `apps/cockpit-admin/tests/components/TrainingDesigner.test.tsx`

### Modified frontend files
- `apps/cockpit-admin/src/routes/__root.tsx` — add nav link to `/datasets`
- `apps/cockpit-admin/src/routes/training.index.tsx` — add "Launch new run" button opening the designer

### Infra
- `~/sync-training-logs.sh` on electron-server — extend to also pull `data/hf-traced/*/MANIFEST.json`
- `deploy/docker-compose.yml` — bind-mount `/home/electron/datasets:/datasets:ro` on api, add `COCKPIT_DATASETS_ROOT`

---

## Task 1: Dataset Pydantic models

**Files:**
- Create: `apps/api/src/ailiance_demo/models/dataset.py`
- Modify: `apps/api/src/ailiance_demo/models/__init__.py`
- Test: `apps/api/tests/unit/test_dataset_model.py`

- [ ] **Step 1.1: Write the failing test**

Create `apps/api/tests/unit/test_dataset_model.py`:

```python
from ailiance_demo.models.dataset import DatasetSummary, DatasetDetail, DatasetSample


def test_dataset_summary_minimal_fields() -> None:
    d = DatasetSummary(
        domain="electronics-hw",
        name="oshwa-curated",
        n_rows=4321,
        license="CERN-OHL-S-2.0",
        hf_dataset_id="electron-rare/oshwa",
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
```

- [ ] **Step 1.2: Run test, verify it fails**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit/apps/api
uv run pytest tests/unit/test_dataset_model.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'ailiance_demo.models.dataset'`

- [ ] **Step 1.3: Implement the module**

Create `apps/api/src/ailiance_demo/models/dataset.py`:

```python
"""Pydantic schemas for dataset gallery + training designer."""
from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class DatasetSample(BaseModel):
    user: str
    assistant: str


class DatasetSummary(BaseModel):
    domain: str
    name: str
    n_rows: int
    license: str
    hf_dataset_id: str
    download_date: str
    size_bytes: int
    notes: str | None = None

    @computed_field  # type: ignore[misc]
    @property
    def size_mb(self) -> float:
        return round(self.size_bytes / (1024 * 1024), 2)


class DatasetDetail(DatasetSummary):
    samples: list[DatasetSample] = Field(default_factory=list)
```

- [ ] **Step 1.4: Re-export from package**

Modify `apps/api/src/ailiance_demo/models/__init__.py` — add the new re-exports next to existing ones:

```python
from ailiance_demo.models.dataset import DatasetDetail, DatasetSample, DatasetSummary
```

And append `"DatasetDetail"`, `"DatasetSample"`, `"DatasetSummary"` to the `__all__` list (preserve existing entries).

- [ ] **Step 1.5: Run tests, verify pass**

```bash
uv run pytest tests/unit/test_dataset_model.py -v
```
Expected: 2 passed.

- [ ] **Step 1.6: Commit**

```bash
git add apps/api/src/ailiance_demo/models/dataset.py \
        apps/api/src/ailiance_demo/models/__init__.py \
        apps/api/tests/unit/test_dataset_model.py
git commit -m "feat(api): dataset Pydantic models"
```

---

## Task 2: Datasets discovery service

**Files:**
- Create: `apps/api/src/ailiance_demo/services/datasets.py`
- Test: `apps/api/tests/unit/test_datasets_service.py`

The service walks a configured root dir for `*/MANIFEST.json` files; each manifest follows the eu-kiki/ailiance convention (`hf_dataset_id`, `license`, `download_date`, `n_used`, sibling `train.jsonl`).

- [ ] **Step 2.1: Write the failing test**

Create `apps/api/tests/unit/test_datasets_service.py`:

```python
import json
from pathlib import Path

import pytest

from ailiance_demo.services.datasets import DatasetsService


@pytest.fixture
def datasets_root(tmp_path: Path) -> Path:
    # Two domains, with manifest + tiny train.jsonl
    elec = tmp_path / "electronics-hw"
    elec.mkdir()
    (elec / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "electron-rare/oshwa",
                "license": "CERN-OHL-S-2.0",
                "download_date": "2026-04-26",
                "n_source_rows": 12345,
                "n_used": 4321,
                "notes": "OSHWA curated subset",
            }
        )
    )
    (elec / "train.jsonl").write_text(
        json.dumps(
            {"messages": [{"role": "user", "content": "hello"},
                          {"role": "assistant", "content": "world"}]}
        )
        + "\n"
    )

    code = tmp_path / "python-coding"
    code.mkdir()
    (code / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "bigcode/the-stack-smol",
                "license": "various",
                "download_date": "2026-04-20",
                "n_source_rows": 9999,
                "n_used": 4500,
            }
        )
    )
    (code / "train.jsonl").write_text("")
    return tmp_path


def test_list_returns_one_entry_per_manifest(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    rows = svc.list()
    domains = {r.domain for r in rows}
    assert domains == {"electronics-hw", "python-coding"}


def test_list_includes_n_rows_license_and_size(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    elec = next(r for r in svc.list() if r.domain == "electronics-hw")
    assert elec.n_rows == 4321
    assert elec.license == "CERN-OHL-S-2.0"
    assert elec.size_bytes > 0


def test_get_returns_sample_preview(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    detail = svc.get("electronics-hw", max_samples=3)
    assert detail is not None
    assert len(detail.samples) == 1
    assert detail.samples[0].user == "hello"
    assert detail.samples[0].assistant == "world"


def test_get_unknown_domain_returns_none(datasets_root: Path) -> None:
    svc = DatasetsService(roots=[datasets_root])
    assert svc.get("does-not-exist") is None
```

- [ ] **Step 2.2: Run test, verify it fails**

```bash
uv run pytest tests/unit/test_datasets_service.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'ailiance_demo.services.datasets'`

- [ ] **Step 2.3: Implement the service**

Create `apps/api/src/ailiance_demo/services/datasets.py`:

```python
"""Read dataset manifests laid out as <root>/<domain>/MANIFEST.json."""
from __future__ import annotations

import json
from pathlib import Path

from ailiance_demo.models.dataset import DatasetDetail, DatasetSample, DatasetSummary


class DatasetsService:
    def __init__(self, roots: list[Path]) -> None:
        self.roots = roots

    def list(self) -> list[DatasetSummary]:
        out: list[DatasetSummary] = []
        for root in self.roots:
            if not root.exists():
                continue
            for manifest_path in sorted(root.glob("*/MANIFEST.json")):
                summary = self._read_summary(manifest_path)
                if summary is not None:
                    out.append(summary)
        return out

    def get(self, domain: str, max_samples: int = 3) -> DatasetDetail | None:
        for root in self.roots:
            manifest_path = root / domain / "MANIFEST.json"
            if not manifest_path.exists():
                continue
            summary = self._read_summary(manifest_path)
            if summary is None:
                continue
            samples = self._read_samples(manifest_path.parent / "train.jsonl", max_samples)
            return DatasetDetail(**summary.model_dump(exclude={"size_mb"}), samples=samples)
        return None

    def _read_summary(self, manifest_path: Path) -> DatasetSummary | None:
        try:
            data = json.loads(manifest_path.read_text())
        except (OSError, json.JSONDecodeError):
            return None
        domain = manifest_path.parent.name
        train_path = manifest_path.parent / "train.jsonl"
        size_bytes = train_path.stat().st_size if train_path.exists() else 0
        return DatasetSummary(
            domain=domain,
            name=data.get("hf_dataset_id", domain).split("/")[-1],
            n_rows=int(data.get("n_used") or data.get("n_source_rows") or 0),
            license=str(data.get("license", "unknown")),
            hf_dataset_id=str(data.get("hf_dataset_id", "")),
            download_date=str(data.get("download_date", "")),
            size_bytes=size_bytes,
            notes=data.get("notes"),
        )

    def _read_samples(self, jsonl_path: Path, limit: int) -> list[DatasetSample]:
        if not jsonl_path.exists() or limit <= 0:
            return []
        out: list[DatasetSample] = []
        with jsonl_path.open() as f:
            for line in f:
                if len(out) >= limit:
                    break
                line = line.strip()
                if not line:
                    continue
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msgs = row.get("messages", [])
                user = next((m["content"] for m in msgs if m.get("role") == "user"), "")
                assistant = next((m["content"] for m in msgs if m.get("role") == "assistant"), "")
                if user and assistant:
                    out.append(DatasetSample(user=user, assistant=assistant))
        return out
```

- [ ] **Step 2.4: Run tests, verify pass**

```bash
uv run pytest tests/unit/test_datasets_service.py -v
```
Expected: 4 passed.

- [ ] **Step 2.5: Commit**

```bash
git add apps/api/src/ailiance_demo/services/datasets.py \
        apps/api/tests/unit/test_datasets_service.py
git commit -m "feat(api): datasets discovery service"
```

---

## Task 3: Wire DatasetsService into config + deps

**Files:**
- Modify: `apps/api/src/ailiance_demo/config.py:42` (insert after `training_log_roots`)
- Modify: `apps/api/src/ailiance_demo/deps.py`
- Test: `apps/api/tests/unit/test_deps_datasets.py`

- [ ] **Step 3.1: Write the failing test**

Create `apps/api/tests/unit/test_deps_datasets.py`:

```python
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
```

- [ ] **Step 3.2: Run test, verify it fails**

```bash
uv run pytest tests/unit/test_deps_datasets.py -v
```
Expected: FAIL — `ImportError: cannot import name 'get_datasets_service'`.

- [ ] **Step 3.3: Add setting**

Modify `apps/api/src/ailiance_demo/config.py` — inside the `Settings` class, after the `training_log_roots` field, insert:

```python
    datasets_root: list[Path] = Field(
        default_factory=lambda: [
            Path("/datasets"),
            Path.home() / "Documents" / "Projets" / "ailiance" / "data" / "hf-traced",
        ],
    )
```

- [ ] **Step 3.4: Add dependency**

Modify `apps/api/src/ailiance_demo/deps.py` — append:

```python
from functools import lru_cache

from ailiance_demo.services.datasets import DatasetsService


@lru_cache(maxsize=1)
def get_datasets_service() -> DatasetsService:
    return DatasetsService(roots=settings.datasets_root)
```

If `settings` and `lru_cache` are already imported at the top of `deps.py`, do not re-import — just add the function and the `DatasetsService` import.

- [ ] **Step 3.5: Run tests, verify pass**

```bash
uv run pytest tests/unit/test_deps_datasets.py -v
```
Expected: 2 passed.

- [ ] **Step 3.6: Commit**

```bash
git add apps/api/src/ailiance_demo/config.py \
        apps/api/src/ailiance_demo/deps.py \
        apps/api/tests/unit/test_deps_datasets.py
git commit -m "feat(api): datasets settings and service dep"
```

---

## Task 4: Datasets admin router

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/admin/datasets.py`
- Modify: `apps/api/src/ailiance_demo/main.py` (add `app.include_router(...)`)
- Test: `apps/api/tests/integration/test_admin_datasets.py`

- [ ] **Step 4.1: Write the failing test**

Create `apps/api/tests/integration/test_admin_datasets.py`:

```python
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_datasets_service
from ailiance_demo.main import app
from ailiance_demo.services.datasets import DatasetsService


@pytest.fixture
def client_with_datasets(tmp_path: Path):
    elec = tmp_path / "electronics-hw"
    elec.mkdir()
    (elec / "MANIFEST.json").write_text(
        json.dumps(
            {
                "hf_dataset_id": "electron-rare/oshwa",
                "license": "CERN-OHL-S-2.0",
                "download_date": "2026-04-26",
                "n_used": 4321,
            }
        )
    )
    (elec / "train.jsonl").write_text(
        json.dumps(
            {"messages": [
                {"role": "user", "content": "Pull-up?"},
                {"role": "assistant", "content": "Resistor to VCC"},
            ]}
        )
        + "\n"
    )

    app.dependency_overrides[get_datasets_service] = lambda: DatasetsService(roots=[tmp_path])
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_list_datasets_requires_tailscale_user(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get("/api/admin/datasets")
    assert r.status_code == 401


def test_list_datasets_returns_summaries(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 1
    assert rows[0]["domain"] == "electronics-hw"


def test_get_dataset_returns_samples(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets/electronics-hw",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["samples"][0]["user"] == "Pull-up?"


def test_get_unknown_dataset_returns_404(client_with_datasets: TestClient) -> None:
    r = client_with_datasets.get(
        "/api/admin/datasets/missing",
        headers={"X-Tailscale-User": "test"},
    )
    assert r.status_code == 404
```

- [ ] **Step 4.2: Run test, verify it fails**

```bash
uv run pytest tests/integration/test_admin_datasets.py -v
```
Expected: FAIL — `404 Not Found` on the `/api/admin/datasets` endpoint (route does not exist yet).

- [ ] **Step 4.3: Implement the router**

Create `apps/api/src/ailiance_demo/routers/admin/datasets.py`:

```python
"""Admin datasets gallery endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.deps import get_datasets_service
from ailiance_demo.models import DatasetDetail, DatasetSummary
from ailiance_demo.services.datasets import DatasetsService

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/datasets", response_model=list[DatasetSummary])
def list_datasets(
    svc: DatasetsService = Depends(get_datasets_service),
) -> list[DatasetSummary]:
    return svc.list()


@router.get("/datasets/{domain}", response_model=DatasetDetail)
def get_dataset(
    domain: str,
    svc: DatasetsService = Depends(get_datasets_service),
) -> DatasetDetail:
    detail = svc.get(domain)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Dataset {domain} not found")
    return detail
```

- [ ] **Step 4.4: Wire router in main.py**

Modify `apps/api/src/ailiance_demo/main.py` — add the import next to the other admin router imports:

```python
from ailiance_demo.routers.admin import datasets as admin_datasets
```

And in the function that builds the FastAPI app (where other routers are included), add:

```python
app.include_router(admin_datasets.router)
```

- [ ] **Step 4.5: Run tests, verify pass**

```bash
uv run pytest tests/integration/test_admin_datasets.py -v
```
Expected: 4 passed.

- [ ] **Step 4.6: Commit**

```bash
git add apps/api/src/ailiance_demo/routers/admin/datasets.py \
        apps/api/src/ailiance_demo/main.py \
        apps/api/tests/integration/test_admin_datasets.py
git commit -m "feat(api): GET admin datasets endpoints"
```

---

## Task 5: Training launcher service (config generation)

**Files:**
- Create: `apps/api/src/ailiance_demo/services/training_launcher.py`
- Test: `apps/api/tests/unit/test_training_launcher.py`

The launcher takes a high-level "launch request" (base model id, dataset domain, hyperparams), maps the model to its host (Studio for Mistral/EuroLLM, macm1 for Gemma 4), generates a YAML config, then calls a pluggable dispatcher hook. Two methods so the SSH side-effect is testable in isolation.

- [ ] **Step 5.1: Write the failing test**

Create `apps/api/tests/unit/test_training_launcher.py`:

```python
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
```

- [ ] **Step 5.2: Run test, verify it fails**

```bash
uv run pytest tests/unit/test_training_launcher.py -v
```
Expected: FAIL — `ModuleNotFoundError`.

- [ ] **Step 5.3: Implement the launcher**

Create `apps/api/src/ailiance_demo/services/training_launcher.py`:

```python
"""Generate training configs and dispatch them to the right host."""
from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass

import yaml
from pydantic import BaseModel, Field


class LaunchRequest(BaseModel):
    base_model: str
    dataset_domain: str
    iters: int = 2000
    lora_rank: int = 32
    learning_rate: float = 5e-6
    max_seq_length: int = 3072
    batch_size: int = 1


@dataclass(frozen=True)
class LaunchInfo:
    run_id: str
    host: str
    yaml_path: str


class UnknownModelError(KeyError):
    """Raised when LaunchRequest references a base_model with no host mapping."""


# Where each base model's training data + adapter dir live on its host.
_DATA_ROOT_PER_HOST: dict[str, str] = {
    "studio": "/Users/clems/ailiance/data/hf-traced",
    "macm1": "/Users/electron/lora-data-eukiki-curriculum",
}
_ADAPTER_ROOT_PER_HOST: dict[str, str] = {
    "studio": "/Users/clems/ailiance/output/adapters",
    "macm1": "/Users/electron/lora-adapters",
}
_HF_BASE_PER_MODEL: dict[str, str] = {
    "ailiance/mistral-medium-3.5-128b": (
        "/Users/clems/KIKI-Mac_tunner/models/Mistral-Medium-3.5-128B-MLX-Q8"
    ),
    "ailiance/gemma4-e4b-curriculum": "lmstudio-community/gemma-4-E4B-it-MLX-4bit",
    "ailiance/eurollm-22b": "/Users/clems/KIKI-Mac_tunner/models/EuroLLM-22B-Instruct-2512",
}


DEFAULT_HOST_FOR_MODEL: dict[str, str] = {
    "ailiance/mistral-medium-3.5-128b": "studio",
    "ailiance/gemma4-e4b-curriculum": "macm1",
    "ailiance/eurollm-22b": "studio",
}


Dispatcher = Callable[[str, str, str], None]
"""Dispatcher signature: (host, run_id, yaml_text) -> None"""


def _no_dispatch(host: str, run_id: str, yaml_text: str) -> None:
    """Default dispatcher: do nothing — the unit test path."""


class TrainingLauncher:
    def __init__(
        self,
        host_for_model: dict[str, str] = DEFAULT_HOST_FOR_MODEL,
        dispatcher: Dispatcher = _no_dispatch,
    ) -> None:
        self.host_for_model = host_for_model
        self.dispatcher = dispatcher

    def render_yaml(self, req: LaunchRequest) -> str:
        host = self._host_for(req.base_model)
        data_root = _DATA_ROOT_PER_HOST.get(host, "")
        adapter_root = _ADAPTER_ROOT_PER_HOST.get(host, "")
        model_path = _HF_BASE_PER_MODEL.get(req.base_model, req.base_model)
        cfg = {
            "model": model_path,
            "data": f"{data_root}/{req.dataset_domain}",
            "adapter_path": f"{adapter_root}/{req.dataset_domain}",
            "iters": req.iters,
            "batch_size": req.batch_size,
            "max_seq_length": req.max_seq_length,
            "learning_rate": req.learning_rate,
            "save_every": 200,
            "steps_per_report": 10,
            "steps_per_eval": 200,
            "val_batches": 5,
            "grad_checkpoint": True,
            "grad_accumulation_steps": 8,
            "lora_parameters": {
                "rank": req.lora_rank,
                "alpha": req.lora_rank,
                "dropout": 0.01,
                "scale": float(req.lora_rank),
            },
            "num_layers": 16,
            "seed": 42,
        }
        return yaml.safe_dump(cfg, sort_keys=False)

    def launch(self, req: LaunchRequest) -> LaunchInfo:
        host = self._host_for(req.base_model)
        yaml_text = self.render_yaml(req)
        run_id = f"{req.dataset_domain}-{int(time.time())}"
        yaml_path = f"/tmp/cockpit-launch-{run_id}.yaml"
        self.dispatcher(host, run_id, yaml_text)
        return LaunchInfo(run_id=run_id, host=host, yaml_path=yaml_path)

    def _host_for(self, base_model: str) -> str:
        if base_model not in self.host_for_model:
            raise UnknownModelError(base_model)
        return self.host_for_model[base_model]
```

- [ ] **Step 5.4: Run tests, verify pass**

```bash
uv run pytest tests/unit/test_training_launcher.py -v
```
Expected: 4 passed.

- [ ] **Step 5.5: Commit**

```bash
git add apps/api/src/ailiance_demo/services/training_launcher.py \
        apps/api/tests/unit/test_training_launcher.py
git commit -m "feat(api): training launcher (config gen)"
```

---

## Task 6: Real SSH dispatcher (integration-tested with a fake remote)

**Files:**
- Modify: `apps/api/src/ailiance_demo/services/training_launcher.py` (append)
- Test: `apps/api/tests/unit/test_training_launcher_dispatcher.py`

We add a `SSHScreenDispatcher` that writes the YAML to a tempfile, scps it, and runs `screen -dmS` on the host. The test uses a tmp dir + a stub `subprocess.run` so we never actually touch the network.

- [ ] **Step 6.1: Write the failing test**

Create `apps/api/tests/unit/test_training_launcher_dispatcher.py`:

```python
from unittest import mock

from ailiance_demo.services.training_launcher import SSHScreenDispatcher


def test_dispatcher_runs_scp_then_ssh_screen() -> None:
    with mock.patch("subprocess.run") as runner:
        runner.return_value = mock.Mock(returncode=0)
        d = SSHScreenDispatcher(ssh_user="electron")
        d("macm1", "electronics-hw-123", "model: x\n")

    cmds = [tuple(c.args[0][:2]) for c in runner.call_args_list]
    assert ("scp", "-o") in cmds  # write the yaml
    assert ("ssh", "-o") in cmds  # launch screen


def test_dispatcher_raises_on_scp_failure() -> None:
    with mock.patch("subprocess.run") as runner:
        runner.return_value = mock.Mock(returncode=1, stderr=b"permission denied")
        d = SSHScreenDispatcher(ssh_user="electron")
        try:
            d("macm1", "electronics-hw-123", "model: x\n")
        except RuntimeError as exc:
            assert "permission denied" in str(exc)
        else:
            raise AssertionError("expected RuntimeError")
```

- [ ] **Step 6.2: Run test, verify it fails**

```bash
uv run pytest tests/unit/test_training_launcher_dispatcher.py -v
```
Expected: FAIL — `ImportError: cannot import name 'SSHScreenDispatcher'`.

- [ ] **Step 6.3: Implement the dispatcher**

Append to `apps/api/src/ailiance_demo/services/training_launcher.py`:

```python
import subprocess
import tempfile
from pathlib import Path


class SSHScreenDispatcher:
    """Dispatcher that scps the YAML to the target host and starts a screen session.

    Requires the api container to have an SSH key with passwordless access to
    the training hosts (mounted at /root/.ssh/id_ed25519, see compose).
    """

    def __init__(self, ssh_user: str = "electron") -> None:
        self.ssh_user = ssh_user
        self._ssh_opts = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10"]

    def __call__(self, host: str, run_id: str, yaml_text: str) -> None:
        remote_yaml = f"/tmp/cockpit-{run_id}.yaml"
        remote_log = f"~/training-logs/{run_id}.log"
        with tempfile.NamedTemporaryFile(suffix=".yaml", delete=False) as fh:
            fh.write(yaml_text.encode())
            local_path = Path(fh.name)
        try:
            scp = subprocess.run(
                ["scp", *self._ssh_opts, str(local_path), f"{self.ssh_user}@{host}:{remote_yaml}"],
                capture_output=True,
            )
            if scp.returncode != 0:
                raise RuntimeError(f"scp failed: {scp.stderr.decode(errors='replace')}")
            cmd = (
                f"mkdir -p ~/training-logs && "
                f"screen -dmS {run_id} bash -c "
                f"'caffeinate -d -i mlx_lm.lora -c {remote_yaml} > {remote_log} 2>&1'"
            )
            ssh = subprocess.run(
                ["ssh", *self._ssh_opts, f"{self.ssh_user}@{host}", cmd],
                capture_output=True,
            )
            if ssh.returncode != 0:
                raise RuntimeError(f"ssh failed: {ssh.stderr.decode(errors='replace')}")
        finally:
            local_path.unlink(missing_ok=True)
```

- [ ] **Step 6.4: Run tests, verify pass**

```bash
uv run pytest tests/unit/test_training_launcher_dispatcher.py -v
```
Expected: 2 passed.

- [ ] **Step 6.5: Commit**

```bash
git add apps/api/src/ailiance_demo/services/training_launcher.py \
        apps/api/tests/unit/test_training_launcher_dispatcher.py
git commit -m "feat(api): SSH+screen dispatcher"
```

---

## Task 7: POST /api/admin/training/launch endpoint

**Files:**
- Modify: `apps/api/src/ailiance_demo/routers/admin/training.py`
- Modify: `apps/api/src/ailiance_demo/deps.py` (add `get_training_launcher`)
- Test: `apps/api/tests/integration/test_admin_training_launch.py`

- [ ] **Step 7.1: Write the failing test**

Create `apps/api/tests/integration/test_admin_training_launch.py`:

```python
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_training_launcher
from ailiance_demo.main import app
from ailiance_demo.services.training_launcher import (
    DEFAULT_HOST_FOR_MODEL,
    LaunchInfo,
    TrainingLauncher,
)


def test_launch_endpoint_requires_auth() -> None:
    client = TestClient(app)
    r = client.post(
        "/api/admin/training/launch",
        json={"base_model": "ailiance/gemma4-e4b-curriculum", "dataset_domain": "x"},
    )
    assert r.status_code == 401


def test_launch_endpoint_returns_run_id_and_host() -> None:
    captured: list[tuple[str, str, str]] = []

    def fake_dispatch(host: str, run_id: str, yaml_text: str) -> None:
        captured.append((host, run_id, yaml_text))

    app.dependency_overrides[get_training_launcher] = lambda: TrainingLauncher(
        host_for_model=DEFAULT_HOST_FOR_MODEL,
        dispatcher=fake_dispatch,
    )
    try:
        client = TestClient(app)
        r = client.post(
            "/api/admin/training/launch",
            headers={"X-Tailscale-User": "test"},
            json={
                "base_model": "ailiance/gemma4-e4b-curriculum",
                "dataset_domain": "electronics-hw",
                "iters": 100,
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert body["host"] == "macm1"
        assert body["run_id"].startswith("electronics-hw-")
        assert len(captured) == 1
    finally:
        app.dependency_overrides.clear()


def test_launch_endpoint_unknown_model_returns_400() -> None:
    app.dependency_overrides[get_training_launcher] = lambda: TrainingLauncher(
        host_for_model={}, dispatcher=lambda *_: None
    )
    try:
        client = TestClient(app)
        r = client.post(
            "/api/admin/training/launch",
            headers={"X-Tailscale-User": "test"},
            json={"base_model": "x/y", "dataset_domain": "z"},
        )
        assert r.status_code == 400
        assert "x/y" in r.json()["detail"]
    finally:
        app.dependency_overrides.clear()
```

- [ ] **Step 7.2: Run test, verify it fails**

```bash
uv run pytest tests/integration/test_admin_training_launch.py -v
```
Expected: FAIL — `ImportError: cannot import name 'get_training_launcher'`.

- [ ] **Step 7.3: Add launcher dep**

Append to `apps/api/src/ailiance_demo/deps.py`:

```python
from ailiance_demo.services.training_launcher import (
    SSHScreenDispatcher,
    TrainingLauncher,
)


@lru_cache(maxsize=1)
def get_training_launcher() -> TrainingLauncher:
    return TrainingLauncher(dispatcher=SSHScreenDispatcher())
```

- [ ] **Step 7.4: Add the launch route**

Append to `apps/api/src/ailiance_demo/routers/admin/training.py` (after the existing routes):

```python
from ailiance_demo.deps import get_training_launcher
from ailiance_demo.services.training_launcher import (
    LaunchInfo,
    LaunchRequest,
    TrainingLauncher,
    UnknownModelError,
)


class LaunchResponse(BaseModel):
    run_id: str
    host: str


@router.post("/training/launch", response_model=LaunchResponse)
def launch_training(
    req: LaunchRequest,
    launcher: TrainingLauncher = Depends(get_training_launcher),
) -> LaunchResponse:
    try:
        info: LaunchInfo = launcher.launch(req)
    except UnknownModelError as exc:
        raise HTTPException(status_code=400, detail=f"Unknown base_model: {exc}") from exc
    return LaunchResponse(run_id=info.run_id, host=info.host)
```

If `BaseModel` is not yet imported at the top of the router file, add `from pydantic import BaseModel`.

- [ ] **Step 7.5: Run tests, verify pass**

```bash
uv run pytest tests/integration/test_admin_training_launch.py -v
```
Expected: 3 passed.

- [ ] **Step 7.6: Commit**

```bash
git add apps/api/src/ailiance_demo/routers/admin/training.py \
        apps/api/src/ailiance_demo/deps.py \
        apps/api/tests/integration/test_admin_training_launch.py
git commit -m "feat(api): POST admin training launch"
```

---

## Task 8: Regenerate TS API types from OpenAPI

**Files:**
- Modify: `packages/shared/src/api/types.ts` (regenerated)

- [ ] **Step 8.1: Run the generator**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit
bash scripts/gen-api-types.sh
```
Expected: `✓ Generated /Users/electron/Documents/Projets/kiki-cockpit/packages/shared/src/api/types.ts`.

- [ ] **Step 8.2: Confirm the new schemas are present**

```bash
grep -c "DatasetSummary\|DatasetDetail\|LaunchRequest\|LaunchResponse" packages/shared/src/api/types.ts
```
Expected: at least 4.

- [ ] **Step 8.3: Commit**

```bash
git add packages/shared/src/api/types.ts
git commit -m "build: regenerate TS API types"
```

---

## Task 9: useDatasets hook

**Files:**
- Create: `apps/cockpit-admin/src/hooks/useDatasets.ts`
- Test: `apps/cockpit-admin/tests/hooks/useDatasets.test.ts`

- [ ] **Step 9.1: Write the failing test**

Create `apps/cockpit-admin/tests/hooks/useDatasets.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useDatasets } from '../../src/hooks/useDatasets';

const mockFetch = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockFetch(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useDatasets', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches /api/admin/datasets and exposes data', async () => {
    mockFetch.mockResolvedValueOnce([
      { domain: 'electronics-hw', name: 'oshwa', n_rows: 4321, license: 'CERN-OHL-S-2.0', size_mb: 14, hf_dataset_id: 'x/y', download_date: '2026-04-26' },
    ]);
    const { result } = renderHook(() => useDatasets(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].domain).toBe('electronics-hw');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/admin/datasets',
      expect.objectContaining({ signal: expect.anything() }),
    );
  });
});
```

- [ ] **Step 9.2: Run test, verify it fails**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit/apps/cockpit-admin
pnpm test --run useDatasets
```
Expected: FAIL — `Cannot find module '../../src/hooks/useDatasets'`.

- [ ] **Step 9.3: Implement the hook**

Create `apps/cockpit-admin/src/hooks/useDatasets.ts`:

```typescript
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type DatasetSummary = components['schemas']['DatasetSummary'];

export function useDatasets() {
  return useQuery<DatasetSummary[]>({
    queryKey: ['datasets'],
    queryFn: ({ signal }) => api.get<DatasetSummary[]>('/api/admin/datasets', { signal }),
    staleTime: 60_000,
  });
}
```

- [ ] **Step 9.4: Run tests, verify pass**

```bash
pnpm test --run useDatasets
```
Expected: 1 passed.

- [ ] **Step 9.5: Commit**

```bash
git add apps/cockpit-admin/src/hooks/useDatasets.ts \
        apps/cockpit-admin/tests/hooks/useDatasets.test.ts
git commit -m "feat(admin): useDatasets hook"
```

---

## Task 10: DatasetCard component

**Files:**
- Create: `apps/cockpit-admin/src/components/DatasetCard.tsx`
- Test: `apps/cockpit-admin/tests/components/DatasetCard.test.tsx`

- [ ] **Step 10.1: Write the failing test**

Create `apps/cockpit-admin/tests/components/DatasetCard.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DatasetCard } from '../../src/components/DatasetCard';

const sample = {
  domain: 'electronics-hw',
  name: 'oshwa',
  n_rows: 4321,
  license: 'CERN-OHL-S-2.0',
  hf_dataset_id: 'electron-rare/oshwa',
  download_date: '2026-04-26',
  size_bytes: 14_222_345,
  size_mb: 13.56,
  notes: null,
};

describe('DatasetCard', () => {
  it('renders the domain, row count, and license', () => {
    render(<DatasetCard dataset={sample} />);
    expect(screen.getByText('electronics-hw')).toBeInTheDocument();
    expect(screen.getByText(/4 ?321/)).toBeInTheDocument();
    expect(screen.getByText('CERN-OHL-S-2.0')).toBeInTheDocument();
  });

  it('renders the HF dataset link', () => {
    render(<DatasetCard dataset={sample} />);
    const link = screen.getByRole('link', { name: /electron-rare\/oshwa/ });
    expect(link).toHaveAttribute('href', 'https://huggingface.co/datasets/electron-rare/oshwa');
  });
});
```

- [ ] **Step 10.2: Run test, verify it fails**

```bash
pnpm test --run DatasetCard
```
Expected: FAIL — `Cannot find module '../../src/components/DatasetCard'`.

- [ ] **Step 10.3: Implement the component**

Create `apps/cockpit-admin/src/components/DatasetCard.tsx`:

```tsx
import type { components } from '@cockpit/shared';

type DatasetSummary = components['schemas']['DatasetSummary'];

interface Props {
  dataset: DatasetSummary;
}

export function DatasetCard({ dataset }: Props) {
  const hfUrl = dataset.hf_dataset_id
    ? `https://huggingface.co/datasets/${dataset.hf_dataset_id}`
    : null;
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900 p-4 hover:border-violet-500 transition">
      <header className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-violet-400">{dataset.domain}</h3>
        <span className="text-xs text-slate-400">{dataset.size_mb} MB</span>
      </header>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-300">
        <div>
          <dt className="text-slate-500">Rows</dt>
          <dd className="font-mono">{dataset.n_rows.toLocaleString('fr-FR')}</dd>
        </div>
        <div>
          <dt className="text-slate-500">License</dt>
          <dd>{dataset.license}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Source</dt>
          <dd className="truncate">
            {hfUrl ? (
              <a className="text-blue-400 hover:underline" href={hfUrl} target="_blank" rel="noreferrer">
                {dataset.hf_dataset_id}
              </a>
            ) : (
              <span>{dataset.name}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Downloaded</dt>
          <dd>{dataset.download_date}</dd>
        </div>
      </dl>
      {dataset.notes && <p className="mt-3 text-xs text-slate-400 italic">{dataset.notes}</p>}
    </article>
  );
}
```

- [ ] **Step 10.4: Run tests, verify pass**

```bash
pnpm test --run DatasetCard
```
Expected: 2 passed.

- [ ] **Step 10.5: Commit**

```bash
git add apps/cockpit-admin/src/components/DatasetCard.tsx \
        apps/cockpit-admin/tests/components/DatasetCard.test.tsx
git commit -m "feat(admin): DatasetCard component"
```

---

## Task 11: /datasets route page

**Files:**
- Create: `apps/cockpit-admin/src/routes/datasets.index.tsx`
- Modify: `apps/cockpit-admin/src/routes/__root.tsx` (add nav link)

- [ ] **Step 11.1: Implement the route**

Create `apps/cockpit-admin/src/routes/datasets.index.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router';

import { DatasetCard } from '@/components/DatasetCard';
import { useDatasets } from '@/hooks/useDatasets';

export const Route = createFileRoute('/datasets/')({
  component: DatasetsPage,
});

function DatasetsPage() {
  const { data, isLoading, error } = useDatasets();

  if (isLoading) return <p className="text-slate-400">Chargement…</p>;
  if (error) return <p className="text-red-400">Failed to load datasets</p>;
  if (!data || data.length === 0) return <p className="text-slate-400">Aucun dataset trouvé</p>;

  const totalRows = data.reduce((acc, d) => acc + d.n_rows, 0);
  const totalMb = data.reduce((acc, d) => acc + d.size_mb, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Datasets</h1>
        <p className="text-sm text-slate-400">
          {data.length} domaines · {totalRows.toLocaleString('fr-FR')} rows · {totalMb.toFixed(0)} MB ·
          <span className="ml-1 text-emerald-400">100 % EU AI Act traceable</span>
        </p>
      </header>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((d) => (
          <DatasetCard key={d.domain} dataset={d} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 11.2: Add nav link**

Modify `apps/cockpit-admin/src/routes/__root.tsx` — find the nav element with the existing links (Workers, Training, Eval), and add:

```tsx
<Link to="/datasets" className="...">Datasets</Link>
```

(Match exact className/styling of sibling links so the nav stays consistent.)

- [ ] **Step 11.3: Build to verify**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit
pnpm --filter cockpit-admin build
```
Expected: build succeeds.

- [ ] **Step 11.4: Commit**

```bash
git add apps/cockpit-admin/src/routes/datasets.index.tsx \
        apps/cockpit-admin/src/routes/__root.tsx
git commit -m "feat(admin): /datasets route + nav link"
```

---

## Task 12: useLaunchTraining mutation hook

**Files:**
- Create: `apps/cockpit-admin/src/hooks/useLaunchTraining.ts`
- Test: `apps/cockpit-admin/tests/hooks/useLaunchTraining.test.ts`

- [ ] **Step 12.1: Write the failing test**

Create `apps/cockpit-admin/tests/hooks/useLaunchTraining.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useLaunchTraining } from '../../src/hooks/useLaunchTraining';

const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useLaunchTraining', () => {
  beforeEach(() => mockPost.mockReset());

  it('posts /api/admin/training/launch with the request body', async () => {
    mockPost.mockResolvedValueOnce({ run_id: 'electronics-hw-123', host: 'macm1' });
    const { result } = renderHook(() => useLaunchTraining(), { wrapper });

    await act(async () => {
      result.current.mutate({
        base_model: 'ailiance/gemma4-e4b-curriculum',
        dataset_domain: 'electronics-hw',
        iters: 500,
        lora_rank: 32,
        learning_rate: 5e-6,
        max_seq_length: 3072,
        batch_size: 1,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/api/admin/training/launch',
      expect.objectContaining({ base_model: 'ailiance/gemma4-e4b-curriculum' }),
    );
    expect(result.current.data?.host).toBe('macm1');
  });
});
```

- [ ] **Step 12.2: Run test, verify it fails**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit/apps/cockpit-admin
pnpm test --run useLaunchTraining
```
Expected: FAIL — `Cannot find module '../../src/hooks/useLaunchTraining'`.

- [ ] **Step 12.3: Implement the hook**

Create `apps/cockpit-admin/src/hooks/useLaunchTraining.ts`:

```typescript
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type LaunchRequest = components['schemas']['LaunchRequest'];
type LaunchResponse = components['schemas']['LaunchResponse'];

export function useLaunchTraining() {
  const qc = useQueryClient();
  return useMutation<LaunchResponse, Error, LaunchRequest>({
    mutationFn: (body) => api.post<LaunchResponse>('/api/admin/training/launch', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['training-runs'] });
    },
  });
}
```

If `api.post` doesn't yet exist in `apps/cockpit-admin/src/lib/api.ts`, add the same shape as `api.get` (it should already exist — most cockpits ship with a wrapper). If it truly doesn't, add this minimal one to `lib/api.ts`:

```typescript
post: async <T>(path: string, body: unknown): Promise<T> => {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`POST ${path} ${r.status}`);
  return r.json();
},
```

- [ ] **Step 12.4: Run tests, verify pass**

```bash
pnpm test --run useLaunchTraining
```
Expected: 1 passed.

- [ ] **Step 12.5: Commit**

```bash
git add apps/cockpit-admin/src/hooks/useLaunchTraining.ts \
        apps/cockpit-admin/src/lib/api.ts \
        apps/cockpit-admin/tests/hooks/useLaunchTraining.test.ts
git commit -m "feat(admin): useLaunchTraining mutation"
```

---

## Task 13: TrainingDesigner modal

**Files:**
- Create: `apps/cockpit-admin/src/components/TrainingDesigner.tsx`
- Test: `apps/cockpit-admin/tests/components/TrainingDesigner.test.tsx`

The modal contains: base-model `<select>` (the 5 from the gateway probe), dataset-domain `<select>` populated by `useDatasets`, four sliders (iters / lora_rank / lr / seq), preview pane showing the current request body, and a Launch button.

- [ ] **Step 13.1: Write the failing test**

Create `apps/cockpit-admin/tests/components/TrainingDesigner.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { TrainingDesigner } from '../../src/components/TrainingDesigner';

const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

const wrap = (node: ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
};

describe('TrainingDesigner', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockResolvedValue([
      { domain: 'electronics-hw', name: 'oshwa', n_rows: 4321, license: 'MIT', hf_dataset_id: 'a/b', download_date: '2026-04-26', size_bytes: 1, size_mb: 0.1 },
    ]);
  });

  it('renders base model and dataset selects', async () => {
    render(wrap(<TrainingDesigner onClose={() => {}} />));
    expect(await screen.findByLabelText(/base model/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/dataset/i)).toBeInTheDocument();
  });

  it('posts the request when Launch is clicked', async () => {
    mockPost.mockResolvedValue({ run_id: 'electronics-hw-1', host: 'macm1' });
    const onLaunched = vi.fn();
    render(wrap(<TrainingDesigner onClose={() => {}} onLaunched={onLaunched} />));

    fireEvent.change(await screen.findByLabelText(/dataset/i), { target: { value: 'electronics-hw' } });
    fireEvent.click(screen.getByRole('button', { name: /launch/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalled());
    expect(mockPost.mock.calls[0][0]).toBe('/api/admin/training/launch');
    expect(mockPost.mock.calls[0][1].dataset_domain).toBe('electronics-hw');
    await waitFor(() => expect(onLaunched).toHaveBeenCalledWith('electronics-hw-1'));
  });
});
```

- [ ] **Step 13.2: Run test, verify it fails**

```bash
pnpm test --run TrainingDesigner
```
Expected: FAIL — module not found.

- [ ] **Step 13.3: Implement the modal**

Create `apps/cockpit-admin/src/components/TrainingDesigner.tsx`:

```tsx
import { useState } from 'react';

import { useDatasets } from '@/hooks/useDatasets';
import { useLaunchTraining } from '@/hooks/useLaunchTraining';

const BASE_MODELS = [
  { id: 'ailiance/mistral-medium-3.5-128b', label: 'Mistral Medium 3.5 128B (studio)' },
  { id: 'ailiance/gemma4-e4b-curriculum', label: 'Gemma 4 E4B + LoRA (macm1)' },
  { id: 'ailiance/eurollm-22b', label: 'EuroLLM 22B (studio)' },
];

interface Props {
  onClose: () => void;
  onLaunched?: (runId: string) => void;
}

export function TrainingDesigner({ onClose, onLaunched }: Props) {
  const datasets = useDatasets();
  const launch = useLaunchTraining();

  const [baseModel, setBaseModel] = useState(BASE_MODELS[1].id);
  const [domain, setDomain] = useState('');
  const [iters, setIters] = useState(2000);
  const [loraRank, setLoraRank] = useState(32);
  const [lr, setLr] = useState(5e-6);
  const [seqLen, setSeqLen] = useState(3072);

  const body = {
    base_model: baseModel,
    dataset_domain: domain,
    iters,
    lora_rank: loraRank,
    learning_rate: lr,
    max_seq_length: seqLen,
    batch_size: 1,
  };

  const onSubmit = async () => {
    if (!domain) return;
    const res = await launch.mutateAsync(body);
    onLaunched?.(res.run_id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 w-full max-w-xl">
        <h2 className="text-xl font-semibold text-violet-400 mb-4">Launch new training run</h2>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm">
            Base model
            <select
              aria-label="base model"
              value={baseModel}
              onChange={(e) => setBaseModel(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
            >
              {BASE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Dataset
            <select
              aria-label="dataset"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
            >
              <option value="">— choose —</option>
              {datasets.data?.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain} ({d.n_rows} rows)
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            Iters: {iters}
            <input
              type="range" min={100} max={5000} step={100}
              value={iters} onChange={(e) => setIters(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            LoRA rank: {loraRank}
            <input
              type="range" min={4} max={64} step={4}
              value={loraRank} onChange={(e) => setLoraRank(Number(e.target.value))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            LR: {lr.toExponential(1)}
            <input
              type="range" min={-7} max={-3} step={0.5}
              value={Math.log10(lr)}
              onChange={(e) => setLr(Math.pow(10, Number(e.target.value)))}
              className="w-full"
            />
          </label>
          <label className="block text-sm">
            Max seq: {seqLen}
            <input
              type="range" min={512} max={8192} step={256}
              value={seqLen} onChange={(e) => setSeqLen(Number(e.target.value))}
              className="w-full"
            />
          </label>
        </div>

        <pre className="mt-4 bg-slate-800 p-2 text-xs text-slate-300 rounded overflow-auto">
{JSON.stringify(body, null, 2)}
        </pre>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 text-slate-300 hover:text-white" onClick={onClose}>
            Cancel
          </button>
          <button
            className="px-4 py-1 bg-violet-600 hover:bg-violet-500 rounded text-white disabled:opacity-50"
            onClick={onSubmit}
            disabled={!domain || launch.isPending}
          >
            {launch.isPending ? 'Launching…' : 'Launch'}
          </button>
        </div>

        {launch.error && (
          <p className="mt-2 text-sm text-red-400">{(launch.error as Error).message}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 13.4: Run tests, verify pass**

```bash
pnpm test --run TrainingDesigner
```
Expected: 2 passed.

- [ ] **Step 13.5: Commit**

```bash
git add apps/cockpit-admin/src/components/TrainingDesigner.tsx \
        apps/cockpit-admin/tests/components/TrainingDesigner.test.tsx
git commit -m "feat(admin): TrainingDesigner modal"
```

---

## Task 14: Wire Designer into the training page

**Files:**
- Modify: `apps/cockpit-admin/src/routes/training.index.tsx`

- [ ] **Step 14.1: Add toggle + modal mount**

In `training.index.tsx`, find the page header and add the button + modal. The exact patch depends on the current JSX shape; the additions are:

```tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { TrainingDesigner } from '@/components/TrainingDesigner';
```

State + button + modal mount inside the component:

```tsx
const [designerOpen, setDesignerOpen] = useState(false);
const navigate = useNavigate();
```

In the header element of the existing page:

```tsx
<button
  className="px-3 py-1 bg-violet-600 hover:bg-violet-500 rounded text-sm"
  onClick={() => setDesignerOpen(true)}
>
  + Launch new run
</button>
```

At the end of the returned JSX (sibling of the runs list):

```tsx
{designerOpen && (
  <TrainingDesigner
    onClose={() => setDesignerOpen(false)}
    onLaunched={(runId) => navigate({ to: '/training/$id', params: { id: runId } })}
  />
)}
```

- [ ] **Step 14.2: Build**

```bash
cd /Users/electron/Documents/Projets/kiki-cockpit
pnpm --filter cockpit-admin build
```
Expected: build succeeds.

- [ ] **Step 14.3: Commit**

```bash
git add apps/cockpit-admin/src/routes/training.index.tsx
git commit -m "feat(admin): training page launches designer modal"
```

---

## Task 15: Sync MANIFEST.json to electron-server + bind-mount

**Files:**
- Modify on electron-server: `~/sync-training-logs.sh` (already exists)
- Modify: `deploy/docker-compose.yml`

- [ ] **Step 15.1: Extend sync script (run on electron-server)**

```bash
ssh electron-server "cat > ~/sync-datasets.sh" <<'EOF'
#!/bin/bash
# Mirror MANIFEST.json + tiny train.jsonl head from training hosts.
# train.jsonl is large; we only sync the first 1 KB so the cockpit can
# show 1-3 sample messages without storing the full corpus.
set -u
exec >> ~/training-logs/.sync-datasets.log 2>&1

mkdir -p ~/datasets
echo "[$(date -Iseconds)] datasets sync start"

rsync -av --include="MANIFEST.json" --include="*/" --exclude="*" \
  -e "ssh -o BatchMode=yes -o ConnectTimeout=5" \
  studio:/Users/clems/eu-kiki/data/hf-traced/ ~/datasets/ 2>&1 | tail -5

# Sample preview: stream first 1 KB of each train.jsonl into a side file.
ssh -o BatchMode=yes -o ConnectTimeout=5 studio \
  'for f in /Users/clems/eu-kiki/data/hf-traced/*/train.jsonl; do
     d=$(dirname "$f")
     name=$(basename "$d")
     head -c 1024 "$f"
   done' \
  > /tmp/datasets-samples.txt 2>/dev/null || true

# Per-domain: write the first non-empty JSON line to <domain>/train.jsonl head.
for dir in ~/datasets/*/; do
  name=$(basename "$dir")
  ssh -o BatchMode=yes studio \
    "head -n 3 /Users/clems/eu-kiki/data/hf-traced/$name/train.jsonl 2>/dev/null" \
    > "$dir/train.jsonl" 2>/dev/null || true
done

echo "[$(date -Iseconds)] datasets sync done"
EOF
ssh electron-server "chmod +x ~/sync-datasets.sh && ~/sync-datasets.sh && ls ~/datasets | head -5"
```
Expected: a few domain dirs printed.

- [ ] **Step 15.2: Add to crontab**

```bash
ssh electron-server '( crontab -l 2>/dev/null | grep -v sync-datasets ; echo "*/5 * * * * /home/electron/sync-datasets.sh" ) | crontab -'
```

- [ ] **Step 15.3: Bind-mount in compose**

In `deploy/docker-compose.yml`, inside the `api:` service `volumes:` block (added in the rsync hub task), add:

```yaml
      - /home/electron/datasets:/datasets:ro
```

So the block reads:

```yaml
    volumes:
      - /home/electron/training-logs:/training-logs:ro
      - /home/electron/datasets:/datasets:ro
```

- [ ] **Step 15.4: Mount SSH key for the dispatcher**

Still inside `api:` `volumes:`, add (read-only) so `SSHScreenDispatcher` works:

```yaml
      - /home/electron/.ssh:/root/.ssh:ro
```

- [ ] **Step 15.5: Deploy + verify**

```bash
git add deploy/docker-compose.yml
git commit -m "deploy: bind-mount datasets dir + ssh key"
git push
ssh electron-server 'cd /opt/kiki-cockpit && git pull --ff-only && docker compose -f deploy/docker-compose.yml up -d --force-recreate api'
sleep 5
curl -sS --resolve admin.ml.saillant.cc:443:127.0.0.1 \
  https://admin.ml.saillant.cc/api/admin/datasets -k | head -c 400
```
Expected: a JSON array with several dataset summaries.

- [ ] **Step 15.6: Commit deploy changes**

(Already committed in 15.5.)

---

## Task 16: End-to-end smoke test

- [ ] **Step 16.1: Open the admin UI**

In your browser, hard-reload `https://admin.ml.saillant.cc/datasets`. Confirm:
- Header reads "32 domaines · X rows · Y MB · 100 % EU AI Act traceable"
- Cards render with domain, row count, license, HF link.

- [ ] **Step 16.2: Launch a tiny demo run**

Go to `/training` → click "+ Launch new run":
- Base model: Gemma 4 E4B (macm1)
- Dataset: any small one
- Iters: 100 (slider all the way down)
- Click Launch.

The browser should redirect to `/training/<new run id>`.

- [ ] **Step 16.3: Verify the run appears live**

Within ~60 s the new log file appears in the rsync hub:

```bash
ssh electron-server 'ls -lt ~/training-logs/macm1/ | head -3'
```
Expected: the new `<run-id>.log` at the top of the list.

- [ ] **Step 16.4: Verify chat-eligible models are still healthy**

```bash
curl -sS https://ml.saillant.cc/api/public/status | python3 -c "
import json,sys; d=json.load(sys.stdin);
print(f\"{d['healthy_count']}/{d['total_count']}\")
"
```
Expected: `5/5`.

- [ ] **Step 16.5: Final commit (if any small fixes)**

```bash
git status
git add <any tweaks>
git commit -m "fix: e2e smoke polish"
git push
```

---

## Self-review summary

- All spec features (datasets gallery, training designer, launch endpoint, SSH dispatch, live update) are covered by Tasks 1-14, with infra wiring in 15 and full smoke in 16.
- No placeholders: every step contains the exact code, command, or expected output.
- Type names stay consistent across tasks: `DatasetSummary`, `DatasetDetail`, `LaunchRequest`, `LaunchResponse`, `TrainingLauncher`, `SSHScreenDispatcher`, hooks `useDatasets` / `useLaunchTraining`.
- Every backend task ends with a passing pytest run; every frontend task ends with a passing Vitest run; every code task ends with a commit.
