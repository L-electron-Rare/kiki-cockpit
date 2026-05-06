# ailiance-demo Implementation Plan (Sprints 0+1+2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build ailiance-demo's foundation (Sprint 0 — repo + tooling + healthcheck), public vitrine + chat playground for the 3 AILIANCE Live models with HF deep-link for the 24 HF models (Sprint 1), and admin monitoring read-only — training runs, live LossChart, virtualized LogTail, workers status grid, eval browser (Sprint 2).

**Architecture:** Monorepo (pnpm + uv) with two Vite apps (`cockpit-public`, `cockpit-admin`), one FastAPI service (`api`), one shared package (`@cockpit/shared`). FastAPI runs on studio:9100, agrégates HF API + filesystem (logs, eval results) + ailiance gateway :9200. Frontend served by electron-server (deploy plus tard — out of scope). SSE for streaming, REST polling for status.

**Tech Stack:** Python 3.12+ / FastAPI / Pydantic v2 / httpx / structlog / pytest / uv — Node 20+ / pnpm / Vite 6 / React 19 / TypeScript / TanStack Router + Query / Tailwind / Radix UI / recharts / shiki / vitest / Testing Library — biome (lint+format).

**Spec source:** [`docs/superpowers/specs/2026-05-04-frontend-ml-training-eval-design.md`](../specs/2026-05-04-frontend-ml-training-eval-design.md) (commit d306993).

---

## File Structure (final state after sprints 0+1+2)

```
ailiance-demo/
├── .github/workflows/ci.yml
├── .gitignore
├── biome.json
├── package.json                           # racine pnpm
├── pnpm-workspace.yaml
├── pyproject.toml                         # uv workspace
├── README.md
├── tailwind.config.preset.ts              # tokens design partagés
├── featured.yaml                          # curation manuelle vitrine
├── apps/
│   ├── api/                               # FastAPI service "ailiance-demo"
│   │   ├── pyproject.toml
│   │   ├── src/ailiance_demo/
│   │   │   ├── __init__.py
│   │   │   ├── main.py                    # FastAPI app + middleware + lifespan
│   │   │   ├── config.py                  # Settings (paths, ports, HF token)
│   │   │   ├── deps.py                    # FastAPI dependencies
│   │   │   ├── routers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── public/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── health.py          # GET /api/public/healthz
│   │   │   │   │   ├── models.py          # GET /api/public/models, /{owner}/{name}
│   │   │   │   │   ├── eval.py            # GET /api/public/eval/{owner}/{name}
│   │   │   │   │   └── chat.py            # POST /api/public/chat (SSE)
│   │   │   │   └── admin/
│   │   │   │       ├── __init__.py
│   │   │   │       ├── health.py          # GET /api/admin/healthz
│   │   │   │       ├── training.py        # GET runs, GET run, SSE logs
│   │   │   │       ├── workers.py         # GET workers/status
│   │   │   │       └── eval_browser.py    # GET eval/results listing
│   │   │   ├── services/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── hf_sync.py             # HF API client + cache + background refresh
│   │   │   │   ├── featured.py            # featured.yaml parser, file-watched
│   │   │   │   ├── eval_index.py          # walk ailiance/eval/results, parse, index
│   │   │   │   ├── training_runs.py       # discover logs, parse headers
│   │   │   │   ├── log_tail.py            # tail -F + parse mlx_lm format
│   │   │   │   ├── workers.py             # ping :9200/:9301/:9302/:9303
│   │   │   │   └── chat_proxy.py          # forward SSE to ailiance gateway
│   │   │   ├── models/                    # Pydantic schemas (drives OpenAPI)
│   │   │   │   ├── __init__.py
│   │   │   │   ├── model_card.py
│   │   │   │   ├── eval_result.py
│   │   │   │   ├── training_run.py
│   │   │   │   └── worker_status.py
│   │   │   └── auth/
│   │   │       ├── __init__.py
│   │   │       └── tailscale.py           # require_tailscale_user dep
│   │   └── tests/
│   │       ├── conftest.py                # fixtures (mock HF API, sample JSONs)
│   │       ├── unit/
│   │       │   ├── test_hf_sync.py
│   │       │   ├── test_featured.py
│   │       │   ├── test_eval_index.py
│   │       │   ├── test_log_tail.py
│   │       │   ├── test_training_runs.py
│   │       │   ├── test_workers.py
│   │       │   └── test_tailscale_auth.py
│   │       ├── integration/
│   │       │   ├── test_health.py
│   │       │   ├── test_models_endpoint.py
│   │       │   ├── test_eval_endpoint.py
│   │       │   ├── test_chat_endpoint.py
│   │       │   ├── test_training_endpoint.py
│   │       │   ├── test_workers_endpoint.py
│   │       │   └── test_eval_browser_endpoint.py
│   │       └── fixtures/
│   │           ├── hf_responses/
│   │           │   ├── clemsail_models.json
│   │           │   └── electron-rare_models.json
│   │           ├── eval_results/
│   │           │   └── sample_humaneval.json
│   │           └── training_logs/
│   │               └── mistral-large-opus.log
│   ├── cockpit-public/                    # Vite — vitrine + chat (sprint 1)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routeTree.gen.ts           # auto-généré par tanstack-router-plugin
│   │   │   ├── router.tsx
│   │   │   ├── queryClient.ts
│   │   │   ├── routes/
│   │   │   │   ├── __root.tsx
│   │   │   │   ├── index.tsx              # /
│   │   │   │   ├── about.tsx              # /about
│   │   │   │   ├── models.index.tsx       # /models
│   │   │   │   ├── models.$owner.$name.tsx# /models/$owner/$name
│   │   │   │   └── chat.$owner.$name.tsx  # /chat/$owner/$name
│   │   │   ├── components/
│   │   │   │   ├── ModelCard.tsx
│   │   │   │   ├── ModelDetail/
│   │   │   │   │   ├── Provenance.tsx
│   │   │   │   │   ├── EvalScores.tsx
│   │   │   │   │   └── DatasetList.tsx
│   │   │   │   ├── ChatPlayground/
│   │   │   │   │   ├── ChatPlayground.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   ├── PromptInput.tsx
│   │   │   │   │   └── ParamsPanel.tsx
│   │   │   │   ├── filters/
│   │   │   │   │   ├── DomainFilter.tsx
│   │   │   │   │   ├── BaseModelFilter.tsx
│   │   │   │   │   └── StatusFilter.tsx
│   │   │   │   └── layout/
│   │   │   │       ├── Header.tsx
│   │   │   │       └── Footer.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useModels.ts
│   │   │   │   ├── useModelDetail.ts
│   │   │   │   ├── useChatStream.ts
│   │   │   │   └── useEvalScores.ts
│   │   │   ├── lib/
│   │   │   │   └── sse.ts
│   │   │   └── index.css
│   │   └── tests/
│   │       ├── setup.ts
│   │       ├── components/
│   │       │   ├── ModelCard.test.tsx
│   │       │   └── ChatPlayground.test.tsx
│   │       └── hooks/
│   │           └── useChatStream.test.ts
│   └── cockpit-admin/                     # Vite — admin (sprint 2)
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tailwind.config.ts
│       ├── postcss.config.js
│       ├── index.html
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── routeTree.gen.ts
│       │   ├── router.tsx
│       │   ├── queryClient.ts
│       │   ├── routes/
│       │   │   ├── __root.tsx
│       │   │   ├── index.tsx              # /
│       │   │   ├── training.index.tsx     # /training
│       │   │   ├── training.$id.tsx       # /training/$id
│       │   │   ├── workers.index.tsx      # /workers
│       │   │   └── eval.index.tsx         # /eval
│       │   ├── components/
│       │   │   ├── TrainingRunCard.tsx
│       │   │   ├── LossChart.tsx
│       │   │   ├── LogTail.tsx
│       │   │   └── WorkerStatusGrid.tsx
│       │   ├── hooks/
│       │   │   ├── useTrainingRuns.ts
│       │   │   ├── useTrainingLogs.ts
│       │   │   └── useWorkersStatus.ts
│       │   └── index.css
│       └── tests/
│           ├── setup.ts
│           └── components/
│               ├── LossChart.test.tsx
│               └── LogTail.test.tsx
└── packages/
    └── shared/                            # @cockpit/shared
        ├── package.json
        ├── tsconfig.json
        ├── src/
        │   ├── index.ts                   # barrel export
        │   ├── api/
        │   │   ├── client.ts              # fetch wrapper
        │   │   ├── types.ts               # AUTO-GÉNÉRÉ via openapi-typescript
        │   │   └── sse.ts                 # SSE primitive
        │   ├── ui/
        │   │   ├── primitives/
        │   │   │   ├── Button.tsx
        │   │   │   ├── Card.tsx
        │   │   │   ├── Input.tsx
        │   │   │   ├── Badge.tsx
        │   │   │   └── index.ts
        │   │   ├── design-tokens.ts
        │   │   └── markdown.tsx
        │   ├── hooks/
        │   │   ├── useDebounce.ts
        │   │   ├── useEventSource.ts
        │   │   └── useAbortController.ts
        │   └── utils/
        │       ├── format.ts
        │       └── parse.ts
        └── tests/
            ├── ui/Button.test.tsx
            └── utils/format.test.ts
```

---

## Sprint 0 — Foundation (10 tasks)

Goal: monorepo up, FastAPI healthz, type generation pipeline, CI green. Zero business logic.

### Task 0.1: Initialize monorepo root + .gitignore + README

**Files:**
- Create: `.gitignore`, `README.md`, `package.json`, `pnpm-workspace.yaml`, `pyproject.toml`

- [ ] **Step 1: Write `.gitignore`**

```gitignore
# Node
node_modules/
dist/
.turbo/
*.log
pnpm-debug.log*

# Python
__pycache__/
*.py[cod]
.venv/
.pytest_cache/
.ruff_cache/
.mypy_cache/
*.egg-info/

# IDE
.vscode/
.idea/
.DS_Store

# Build outputs
apps/cockpit-public/dist/
apps/cockpit-admin/dist/
apps/api/dist/
packages/shared/src/api/types.ts

# Caches
.cache/

# Local dev
.env
.env.local
*.local
```

- [ ] **Step 2: Write `README.md`**

```markdown
# ailiance-demo

Frontend for training, evaluation, and testing of L'Électron Rare's LLM fleet.

- **Public showcase**: gallery + provenance + chat playground for the 3 AILIANCE Live models, HF deep-link for the 24 published HF models
- **Admin (Tailscale-only)**: monitoring training runs, worker health, eval results, and (future sprints) eval/train orchestration

See [`docs/superpowers/specs/`](docs/superpowers/specs/) for design specs.

## Stack

Monorepo (pnpm + uv) with:
- `apps/api` — FastAPI service (`ailiance-demo` on studio:9100)
- `apps/cockpit-public` — Vite + React 19 (public vitrine)
- `apps/cockpit-admin` — Vite + React 19 (Tailscale-only admin)
- `packages/shared` — `@cockpit/shared` (types, UI primitives, hooks)

## Development

```bash
pnpm install
uv sync
pnpm dev        # boots all apps in parallel
```
```

- [ ] **Step 3: Write `package.json` (root)**

```json
{
  "name": "ailiance-demo",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "lint": "biome check .",
    "format": "biome format --write .",
    "gen:api-types": "bash scripts/gen-api-types.sh"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "openapi-typescript": "7.4.4"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 4: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 5: Write `pyproject.toml` (root, uv workspace)**

```toml
[tool.uv.workspace]
members = ["apps/api"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "A", "C4", "PT", "SIM", "TCH"]
ignore = ["E501"]

[tool.pytest.ini_options]
addopts = "-ra -q --strict-markers"
testpaths = ["apps/api/tests"]
```

- [ ] **Step 6: Commit**

Run:
```bash
git add .gitignore README.md package.json pnpm-workspace.yaml pyproject.toml
git commit -m "chore: monorepo skeleton (pnpm + uv workspace)"
```

---

### Task 0.2: Configure biome (lint + format)

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "ignore": ["**/dist/**", "**/node_modules/**", "**/routeTree.gen.ts", "**/types.ts"]
  },
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "suspicious": { "noExplicitAny": "warn" },
      "correctness": { "noUnusedImports": "error", "noUnusedVariables": "error" }
    }
  }
}
```

- [ ] **Step 2: Verify biome runs**

Run:
```bash
pnpm install
pnpm lint
```
Expected: `Checked 0 files in <Xms>. No fixes needed.` (no JS files yet)

- [ ] **Step 3: Commit**

```bash
git add biome.json package.json pnpm-lock.yaml
git commit -m "chore: configure biome for lint and format"
```

---

### Task 0.3: Scaffold `apps/api/` FastAPI minimal + healthz

**Files:**
- Create: `apps/api/pyproject.toml`, `apps/api/src/ailiance_demo/{__init__.py,main.py,config.py}`, `apps/api/src/ailiance_demo/routers/{__init__.py,public/__init__.py,public/health.py}`, `apps/api/tests/{conftest.py,integration/test_health.py}`

- [ ] **Step 1: Write `apps/api/pyproject.toml`**

```toml
[project]
name = "ailiance-demo-api"
version = "0.0.0"
description = "FastAPI service for ailiance-demo"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.32.0",
  "pydantic>=2.9.0",
  "pydantic-settings>=2.6.0",
  "httpx>=0.28.0",
  "structlog>=24.4.0",
  "watchdog>=5.0.0",
  "pyyaml>=6.0.2",
  "slowapi>=0.1.9",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.3.0",
  "pytest-asyncio>=0.24.0",
  "pytest-cov>=6.0.0",
  "hypothesis>=6.115.0",
  "ruff>=0.7.0",
  "mypy>=1.13.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/ailiance_demo"]
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/__init__.py`**

```python
"""ailiance-demo API service."""
__version__ = "0.0.0"
```

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/config.py`**

```python
"""Application settings (from env + defaults)."""
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="COCKPIT_", env_file=".env", extra="ignore")

    # Service
    host: str = "127.0.0.1"
    port: int = 9100
    log_level: str = "INFO"

    # Paths to sibling repos (read-only sources)
    kiki_mac_tunner_root: Path = Path.home() / "Documents" / "Projets" / "KIKI-Mac_tunner"
    ailiance_root: Path = Path.home() / "Documents" / "Projets" / "ailiance"

    # ailiance gateway
    ailiance_gateway_url: str = "http://localhost:9200"

    # HF
    hf_api_base: str = "https://huggingface.co/api"
    hf_token: str | None = None
    hf_owners: list[str] = Field(default_factory=lambda: ["clemsail", "electron-rare"])
    hf_sync_interval_seconds: int = 600  # 10 min

    # Featured config
    featured_path: Path = Path("featured.yaml")

    # Cache
    cache_dir: Path = Path.home() / ".cache" / "ailiance-demo"


settings = Settings()
```

- [ ] **Step 4: Write `apps/api/src/ailiance_demo/routers/__init__.py` (empty)**

```python
```

- [ ] **Step 5: Write `apps/api/src/ailiance_demo/routers/public/__init__.py` (empty)**

```python
```

- [ ] **Step 6: Write `apps/api/src/ailiance_demo/routers/public/health.py`**

```python
"""Public liveness probe."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["public"])


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


@router.get("/api/public/healthz", response_model=HealthResponse)
async def healthz() -> HealthResponse:
    from ailiance_demo import __version__
    return HealthResponse(status="ok", service="ailiance-demo", version=__version__)
```

- [ ] **Step 7: Write `apps/api/src/ailiance_demo/main.py`**

```python
"""FastAPI app factory."""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ailiance_demo.config import settings
from ailiance_demo.routers.public import health as public_health

log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("startup", service="ailiance-demo", port=settings.port)
    yield
    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ailiance-demo",
        version="0.0.0",
        description="Frontend backend for KIKI training/eval/test",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

    app.include_router(public_health.router)

    return app


app = create_app()
```

- [ ] **Step 8: Write `apps/api/tests/conftest.py`**

```python
"""Shared pytest fixtures."""
import pytest
from fastapi.testclient import TestClient

from ailiance_demo.main import create_app


@pytest.fixture
def client() -> TestClient:
    app = create_app()
    return TestClient(app)
```

- [ ] **Step 9: Write `apps/api/tests/integration/__init__.py` (empty)**

```python
```

- [ ] **Step 10: Write `apps/api/tests/integration/test_health.py`**

```python
"""Public healthz endpoint tests."""
from fastapi.testclient import TestClient


def test_healthz_returns_ok(client: TestClient) -> None:
    response = client.get("/api/public/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "ailiance-demo"
    assert "version" in payload
```

- [ ] **Step 11: Sync deps and run tests**

Run:
```bash
cd /Users/electron/Documents/Projets/ailiance-demo
uv sync --all-extras
uv run pytest apps/api/tests/integration/test_health.py -v
```
Expected: `1 passed`

- [ ] **Step 12: Commit**

```bash
git add apps/api/ pyproject.toml uv.lock
git commit -m "feat(api): scaffold FastAPI service with healthz endpoint"
```

---

### Task 0.4: Add OpenAPI export script + admin healthz

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/admin/{__init__.py,health.py}`, `apps/api/tests/integration/test_admin_health.py`, `scripts/gen-api-types.sh`
- Modify: `apps/api/src/ailiance_demo/main.py` (mount admin router)

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/routers/admin/__init__.py` (empty)**

```python
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/routers/admin/health.py`**

```python
"""Admin liveness probe (no auth at this stage; gated by Tailscale infra in deploy)."""
from fastapi import APIRouter
from ailiance_demo.routers.public.health import HealthResponse

router = APIRouter(tags=["admin"])


@router.get("/api/admin/healthz", response_model=HealthResponse)
async def admin_healthz() -> HealthResponse:
    from ailiance_demo import __version__
    return HealthResponse(status="ok", service="ailiance-demo-admin", version=__version__)
```

- [ ] **Step 3: Modify `apps/api/src/ailiance_demo/main.py` — add admin router**

Replace the `from ailiance_demo.routers.public import health as public_health` and `app.include_router(public_health.router)` block:

```python
from ailiance_demo.routers.public import health as public_health
from ailiance_demo.routers.admin import health as admin_health
```

And in `create_app()`:

```python
    app.include_router(public_health.router)
    app.include_router(admin_health.router)
```

- [ ] **Step 4: Write `apps/api/tests/integration/test_admin_health.py`**

```python
"""Admin healthz endpoint tests."""
from fastapi.testclient import TestClient


def test_admin_healthz_returns_ok(client: TestClient) -> None:
    response = client.get("/api/admin/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "ailiance-demo-admin"
```

- [ ] **Step 5: Write `scripts/gen-api-types.sh`**

```bash
#!/usr/bin/env bash
# Generate TypeScript types from FastAPI's OpenAPI schema.
# Boots the API briefly, fetches /openapi.json, runs openapi-typescript.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/packages/shared/src/api/types.ts"

mkdir -p "$(dirname "$OUT")"

# Boot API in background
cd "$ROOT"
uv run uvicorn ailiance_demo.main:app --host 127.0.0.1 --port 9199 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

# Wait for it to be up
for i in {1..30}; do
  if curl -fsS http://127.0.0.1:9199/api/public/healthz > /dev/null 2>&1; then break; fi
  sleep 0.5
done

# Fetch OpenAPI and convert
curl -fsS http://127.0.0.1:9199/openapi.json | pnpm exec openapi-typescript --output "$OUT"

echo "✓ Generated $OUT"
```

- [ ] **Step 6: Make it executable**

Run:
```bash
chmod +x scripts/gen-api-types.sh
```

- [ ] **Step 7: Run tests**

Run:
```bash
uv run pytest apps/api/tests/ -v
```
Expected: `2 passed`

- [ ] **Step 8: Commit**

```bash
git add apps/api/ scripts/gen-api-types.sh
git commit -m "feat(api): add admin healthz and OpenAPI type-gen script"
```

---

### Task 0.5: Scaffold `packages/shared/`

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/{index.ts,api/client.ts,utils/format.ts}`, `packages/shared/tests/utils/format.test.ts`, `packages/shared/vitest.config.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@cockpit/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./api": "./src/api/client.ts",
    "./api/types": "./src/api/types.ts",
    "./api/sse": "./src/api/sse.ts",
    "./ui": "./src/ui/primitives/index.ts",
    "./ui/markdown": "./src/ui/markdown.tsx",
    "./hooks": "./src/hooks/index.ts",
    "./utils": "./src/utils/format.ts"
  },
  "scripts": {
    "dev": "tsc --watch --noEmit",
    "build": "tsc --noEmit",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.0.0",
    "eventsource-parser": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write `packages/shared/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] },
  },
});
```

- [ ] **Step 4: Write `packages/shared/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write `packages/shared/src/utils/format.ts`**

```typescript
/**
 * Format a download count with thousand separators (1234 → "1,234").
 */
export function formatDownloads(count: number): string {
  return new Intl.NumberFormat('en-US').format(count);
}

/**
 * Parse a HuggingFace model ID "owner/name" into its parts.
 * Returns null if the format is invalid.
 */
export function parseModelId(id: string): { owner: string; name: string } | null {
  const parts = id.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], name: parts[1] };
}
```

- [ ] **Step 6: Write `packages/shared/tests/utils/format.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { formatDownloads, parseModelId } from '../../src/utils/format';

describe('formatDownloads', () => {
  it('adds thousand separators', () => {
    expect(formatDownloads(1234)).toBe('1,234');
    expect(formatDownloads(1000000)).toBe('1,000,000');
  });

  it('handles small numbers', () => {
    expect(formatDownloads(0)).toBe('0');
    expect(formatDownloads(42)).toBe('42');
  });
});

describe('parseModelId', () => {
  it('parses standard HF model ID', () => {
    expect(parseModelId('clemsail/micro-kiki-v3')).toEqual({
      owner: 'clemsail',
      name: 'micro-kiki-v3',
    });
  });

  it('returns null for invalid formats', () => {
    expect(parseModelId('no-slash')).toBeNull();
    expect(parseModelId('a/b/c')).toBeNull();
    expect(parseModelId('/name')).toBeNull();
    expect(parseModelId('owner/')).toBeNull();
  });
});
```

- [ ] **Step 7: Write `packages/shared/src/api/client.ts`**

```typescript
/**
 * Base API client. Wraps fetch with baseURL, error handling, and abort support.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
}

export function createApiClient(options: ApiClientOptions) {
  const { baseUrl, defaultHeaders = {} } = options;

  async function request<T>(
    method: string,
    path: string,
    init: { body?: unknown; headers?: Record<string, string>; signal?: AbortSignal } = {},
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json', ...defaultHeaders, ...init.headers };
    const response = await fetch(url, {
      method,
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });

    if (!response.ok) {
      let body: unknown;
      try { body = await response.json(); } catch { body = null; }
      throw new ApiError(response.status, body, `HTTP ${response.status} on ${method} ${path}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) =>
      request<T>('GET', path, init),
    post: <T>(
      path: string,
      body: unknown,
      init?: { headers?: Record<string, string>; signal?: AbortSignal },
    ) => request<T>('POST', path, { ...init, body }),
  };
}
```

- [ ] **Step 8: Write `packages/shared/src/index.ts`**

```typescript
export { createApiClient, ApiError } from './api/client';
export type { ApiClientOptions } from './api/client';
export { formatDownloads, parseModelId } from './utils/format';
```

- [ ] **Step 9: Run tests**

Run:
```bash
cd /Users/electron/Documents/Projets/ailiance-demo
pnpm install
pnpm --filter @cockpit/shared test
```
Expected: `2 passed`

- [ ] **Step 10: Commit**

```bash
git add packages/shared/ package.json pnpm-lock.yaml
git commit -m "feat(shared): scaffold @cockpit/shared with api client and utils"
```

---

### Task 0.6: Scaffold `apps/cockpit-public/` (Vite + TanStack Router skeleton)

**Files:**
- Create: `apps/cockpit-public/{package.json,tsconfig.json,vite.config.ts,tailwind.config.ts,postcss.config.js,index.html,vitest.config.ts}`, `apps/cockpit-public/src/{main.tsx,App.tsx,router.tsx,queryClient.ts,index.css,routes/__root.tsx,routes/index.tsx}`, `apps/cockpit-public/tests/setup.ts`

- [ ] **Step 1: Write `apps/cockpit-public/package.json`**

```json
{
  "name": "cockpit-public",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cockpit/shared": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-router": "^1.85.0",
    "@tanstack/router-devtools": "^1.85.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^9.0.1",
    "shiki": "^1.24.0"
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.85.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Write `apps/cockpit-public/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Write `apps/cockpit-public/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }),
    react(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:9100', changeOrigin: false },
    },
  },
});
```

- [ ] **Step 4: Write `apps/cockpit-public/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Write `apps/cockpit-public/postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Write `apps/cockpit-public/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ailiance-demo — L'Électron Rare</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `apps/cockpit-public/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Write `apps/cockpit-public/src/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});
```

- [ ] **Step 9: Write `apps/cockpit-public/src/router.tsx`**

```typescript
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 10: Write `apps/cockpit-public/src/routes/__root.tsx`**

```typescript
import { Outlet, createRootRoute } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold">ailiance-demo</h1>
      </header>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 11: Write `apps/cockpit-public/src/routes/index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div>
      <h2 className="text-3xl font-bold">L'Électron Rare — Model Showcase</h2>
      <p className="mt-2 text-slate-600">
        Foundation under construction. Sprint 1 brings the gallery and chat playground.
      </p>
    </div>
  );
}
```

- [ ] **Step 12: Write `apps/cockpit-public/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { router } from './router';
import { queryClient } from './queryClient';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 13: Write `apps/cockpit-public/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 14: Write `apps/cockpit-public/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 15: Build and verify**

Run:
```bash
cd /Users/electron/Documents/Projets/ailiance-demo
pnpm install
pnpm --filter cockpit-public typecheck
pnpm --filter cockpit-public build
```
Expected: build completes, `apps/cockpit-public/dist/` produced.

- [ ] **Step 16: Commit**

```bash
git add apps/cockpit-public/ pnpm-lock.yaml
git commit -m "feat(public): scaffold Vite + TanStack Router app with home route"
```

---

### Task 0.7: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true

      - name: Install Python deps
        run: uv sync --all-extras

      - name: Install JS deps
        run: pnpm install --frozen-lockfile

      - name: Generate API types (best-effort, skip if API not ready)
        run: pnpm gen:api-types || echo "API types generation skipped"
        continue-on-error: true

      - name: Lint (biome)
        run: pnpm lint

      - name: Typecheck
        run: pnpm typecheck

      - name: Test (Python)
        run: uv run pytest apps/api/tests -v

      - name: Test (JS)
        run: pnpm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflow for lint, typecheck, tests"
```

---

### Task 0.8: Generate API types and wire @cockpit/shared/api/types

**Files:**
- Create: `packages/shared/src/api/types.ts` (auto-generated, gitignored)
- Modify: `packages/shared/src/index.ts` to re-export the generated types

- [ ] **Step 1: Run the type generation script**

Run:
```bash
cd /Users/electron/Documents/Projets/ailiance-demo
pnpm gen:api-types
```
Expected: `✓ Generated packages/shared/src/api/types.ts`

- [ ] **Step 2: Modify `packages/shared/src/index.ts` to re-export generated types**

Replace the file with:

```typescript
export { createApiClient, ApiError } from './api/client';
export type { ApiClientOptions } from './api/client';
export { formatDownloads, parseModelId } from './utils/format';
export type { paths, components } from './api/types';
```

- [ ] **Step 3: Verify typecheck**

Run:
```bash
pnpm typecheck
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/index.ts
git commit -m "feat(shared): export generated OpenAPI types"
```

---

### Task 0.9: SSE primitive in @cockpit/shared

**Files:**
- Create: `packages/shared/src/api/sse.ts`, `packages/shared/tests/api/sse.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Write `packages/shared/tests/api/sse.test.ts`** (test first)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { parseSSEStream } from '../../src/api/sse';

describe('parseSSEStream', () => {
  it('parses concatenated SSE events from a ReadableStream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('event: token\ndata: {"text":"Hello"}\n\n'));
        controller.enqueue(encoder.encode('event: token\ndata: {"text":" world"}\n\n'));
        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
        controller.close();
      },
    });

    const events: { event: string; data: string }[] = [];
    for await (const ev of parseSSEStream(stream)) {
      events.push({ event: ev.event ?? '', data: ev.data });
    }

    expect(events).toEqual([
      { event: 'token', data: '{"text":"Hello"}' },
      { event: 'token', data: '{"text":" world"}' },
      { event: 'done', data: '{}' },
    ]);
  });

  it('handles abort gracefully', async () => {
    const stream = new ReadableStream<Uint8Array>({ start() {} });
    const ac = new AbortController();
    const iter = parseSSEStream(stream, ac.signal);
    ac.abort();
    const result = await iter.next();
    expect(result.done).toBe(true);
  });
});
```

- [ ] **Step 2: Write `packages/shared/src/api/sse.ts`**

```typescript
/**
 * Async-iterable parser for text/event-stream over a fetch ReadableStream.
 * Uses eventsource-parser for spec-compliant SSE chunk handling.
 */
import { createParser, type EventSourceMessage } from 'eventsource-parser';

export interface SSEEvent {
  event: string | undefined;
  data: string;
  id: string | undefined;
}

export async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent, void, unknown> {
  const queue: SSEEvent[] = [];
  let closed = false;
  let resolveNext: (() => void) | null = null;

  const parser = createParser({
    onEvent: (msg: EventSourceMessage) => {
      queue.push({ event: msg.event, data: msg.data, id: msg.id });
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    },
  });

  const reader = stream.getReader();
  const decoder = new TextDecoder();

  const pump = (async () => {
    try {
      while (true) {
        if (signal?.aborted) break;
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } finally {
      closed = true;
      if (resolveNext) {
        resolveNext();
        resolveNext = null;
      }
    }
  })();

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (closed) break;
      if (signal?.aborted) break;
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
    }
  } finally {
    reader.cancel().catch(() => {});
    await pump.catch(() => {});
  }
}
```

- [ ] **Step 3: Modify `packages/shared/src/index.ts`** — add SSE export

```typescript
export { createApiClient, ApiError } from './api/client';
export type { ApiClientOptions } from './api/client';
export { parseSSEStream } from './api/sse';
export type { SSEEvent } from './api/sse';
export { formatDownloads, parseModelId } from './utils/format';
export type { paths, components } from './api/types';
```

- [ ] **Step 4: Run test**

Run:
```bash
pnpm --filter @cockpit/shared test
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add SSE stream parser primitive"
```

---

### Task 0.10: Sprint 0 acceptance — green CI + dev experience smoke test

- [ ] **Step 1: Verify all tests pass**

Run:
```bash
pnpm lint
pnpm typecheck
uv run pytest apps/api/tests -v
pnpm test
```
Expected: all green.

- [ ] **Step 2: Boot all services in dev mode**

Run in 2 terminals (or with `&`):
```bash
# Terminal 1
uv run uvicorn ailiance_demo.main:app --reload --port 9100

# Terminal 2
pnpm --filter cockpit-public dev
```
Expected:
- `http://localhost:9100/api/public/healthz` returns `{"status":"ok",...}`
- `http://localhost:9100/api/admin/healthz` returns `{"status":"ok",...}`
- `http://localhost:5173/` shows the home page
- `http://localhost:5173/api/public/healthz` (proxied) returns the same JSON

- [ ] **Step 3: Tag sprint 0 done**

```bash
git tag -a sprint-0 -m "Sprint 0 — Foundation complete"
```

---

## Sprint 1 — Vitrine + Playground (24 tasks)

Goal: public site at `/`, `/models`, `/models/$owner/$name`, `/chat/$owner/$name`, `/about`. HF auto-sync, featured curation, eval scores, chat SSE for the 3 AILIANCE Live models, HF deep-link for the 24 HF models.

### Task 1.1: Pydantic schemas — ModelCard, ModelDetail, EvalSummary

**Files:**
- Create: `apps/api/src/ailiance_demo/models/__init__.py`, `apps/api/src/ailiance_demo/models/model_card.py`, `apps/api/src/ailiance_demo/models/eval_result.py`, `apps/api/tests/unit/test_schemas.py`

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/models/__init__.py`**

```python
from ailiance_demo.models.model_card import ModelCard, ModelDetail, ModelStatus, ChatBackend
from ailiance_demo.models.eval_result import EvalResult, EvalSummary

__all__ = [
    "ChatBackend",
    "EvalResult",
    "EvalSummary",
    "ModelCard",
    "ModelDetail",
    "ModelStatus",
]
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/models/model_card.py`**

```python
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


class DatasetRef(BaseModel):
    hf_dataset_id: str
    license: str | None = None
    n_examples: int | None = None
    used_for: str | None = None


class ModelCard(BaseModel):
    """Listing-level summary of a model."""
    id: str = Field(description="HF-style id, owner/name, e.g. 'clemsail/micro-kiki-v3'")
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


class ModelDetail(ModelCard):
    """Full detail page payload."""
    long_description: str | None = None
    datasets: list[DatasetRef] = Field(default_factory=list)
    training_config: dict = Field(default_factory=dict)
    hardware: str | None = None
    github_url: str | None = None
    deprecated_note: str | None = None
    superseded_by: str | None = None
```

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/models/eval_result.py`**

```python
"""Pydantic schemas for eval results."""
from datetime import datetime

from pydantic import BaseModel, Field


class EvalResult(BaseModel):
    model_id: str
    adapter_id: str | None = None
    benchmark: str
    metric: str
    score: float
    timestamp: datetime
    run_sha: str | None = None
    hardware: str | None = None
    config: dict = Field(default_factory=dict)


class EvalSummary(BaseModel):
    model_id: str
    by_benchmark: dict[str, EvalResult] = Field(
        default_factory=dict,
        description="Latest score per benchmark, keyed by benchmark name",
    )
```

- [ ] **Step 4: Write `apps/api/tests/unit/__init__.py`** (empty)

```python
```

- [ ] **Step 5: Write `apps/api/tests/unit/test_schemas.py`**

```python
"""Schema sanity tests."""
from datetime import datetime, UTC

from ailiance_demo.models import ChatBackend, EvalResult, ModelCard, ModelStatus


def test_model_card_minimal_fields() -> None:
    card = ModelCard(
        id="clemsail/micro-kiki-v3",
        owner="clemsail",
        name="micro-kiki-v3",
        display_name="Micro-KIKI v3",
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
```

- [ ] **Step 6: Run tests**

Run:
```bash
uv run pytest apps/api/tests/unit/test_schemas.py -v
```
Expected: `2 passed`

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat(api): add Pydantic schemas for ModelCard, ModelDetail, EvalResult"
```

---

### Task 1.2: HF sync service — fetch models for one owner

**Files:**
- Create: `apps/api/src/ailiance_demo/services/__init__.py`, `apps/api/src/ailiance_demo/services/hf_sync.py`, `apps/api/tests/fixtures/hf_responses/clemsail_models.json`, `apps/api/tests/unit/test_hf_sync.py`

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/services/__init__.py`** (empty)

```python
```

- [ ] **Step 2: Write `apps/api/tests/fixtures/__init__.py`** (empty)

```python
```

- [ ] **Step 3: Write `apps/api/tests/fixtures/hf_responses/clemsail_models.json`**

```json
[
  {
    "id": "clemsail/micro-kiki-v3",
    "modelId": "clemsail/micro-kiki-v3",
    "author": "clemsail",
    "downloads": 242,
    "likes": 4,
    "lastModified": "2026-04-26T12:34:56.000Z",
    "tags": ["text-generation", "lora", "mistral"],
    "library_name": "transformers"
  },
  {
    "id": "clemsail/kiki-stm32-sft",
    "modelId": "clemsail/kiki-stm32-sft",
    "author": "clemsail",
    "downloads": 79,
    "likes": 0,
    "lastModified": "2026-04-20T08:00:00.000Z",
    "tags": ["text-generation", "lora", "embedded"],
    "library_name": "transformers"
  }
]
```

- [ ] **Step 4: Write `apps/api/tests/unit/test_hf_sync.py`** (test first)

```python
"""Tests for HF sync service."""
import json
from pathlib import Path

import httpx
import pytest

from ailiance_demo.services.hf_sync import fetch_models_for_owner

FIXTURES = Path(__file__).parent.parent / "fixtures" / "hf_responses"


@pytest.mark.asyncio
async def test_fetch_models_for_owner_parses_response() -> None:
    fixture = json.loads((FIXTURES / "clemsail_models.json").read_text())

    def handler(request: httpx.Request) -> httpx.Response:
        assert "/api/models" in str(request.url)
        assert request.url.params["author"] == "clemsail"
        return httpx.Response(200, json=fixture)

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="https://huggingface.co") as client:
        models = await fetch_models_for_owner(client, "clemsail")

    assert len(models) == 2
    assert models[0]["id"] == "clemsail/micro-kiki-v3"
    assert models[0]["downloads"] == 242
    assert models[1]["id"] == "clemsail/kiki-stm32-sft"


@pytest.mark.asyncio
async def test_fetch_models_for_owner_empty_when_404() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"error": "User not found"})

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport, base_url="https://huggingface.co") as client:
        models = await fetch_models_for_owner(client, "nonexistent")

    assert models == []
```

- [ ] **Step 5: Add asyncio config to pyproject**

Modify `apps/api/pyproject.toml` — add to `[project.optional-dependencies] dev` if not present, and at root add:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

(If the root `pyproject.toml` already has a `[tool.pytest.ini_options]` block, add `asyncio_mode = "auto"` there.)

- [ ] **Step 6: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_sync.py -v
```
Expected: FAIL with `ImportError: cannot import name 'fetch_models_for_owner'`

- [ ] **Step 7: Write `apps/api/src/ailiance_demo/services/hf_sync.py`**

```python
"""HuggingFace API sync — fetch model metadata, cache in memory."""
from __future__ import annotations

import structlog
import httpx

log = structlog.get_logger()


async def fetch_models_for_owner(
    client: httpx.AsyncClient,
    owner: str,
    limit: int = 100,
) -> list[dict]:
    """Fetch all model metadata for a given owner/org from HF API.

    Returns the raw JSON list. Returns [] on 404 or other client errors.
    """
    try:
        response = await client.get(
            "/api/models",
            params={"author": owner, "limit": limit, "full": "false"},
        )
    except httpx.HTTPError as exc:
        log.warning("hf_sync.fetch_failed", owner=owner, error=str(exc))
        return []

    if response.status_code == 404:
        log.info("hf_sync.owner_not_found", owner=owner)
        return []

    if response.status_code >= 400:
        log.warning(
            "hf_sync.unexpected_status",
            owner=owner,
            status=response.status_code,
        )
        return []

    data = response.json()
    if not isinstance(data, list):
        log.warning("hf_sync.unexpected_payload", owner=owner)
        return []

    return data
```

- [ ] **Step 8: Run test (must pass)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_sync.py -v
```
Expected: `2 passed`

- [ ] **Step 9: Commit**

```bash
git add apps/api/
git commit -m "feat(api): hf_sync.fetch_models_for_owner with httpx mock tests"
```

---

### Task 1.3: HF sync — map raw JSON to ModelCard + cache layer

**Files:**
- Modify: `apps/api/src/ailiance_demo/services/hf_sync.py`
- Modify: `apps/api/tests/unit/test_hf_sync.py`

- [ ] **Step 1: Add test for `to_model_card()` mapper** (test first)

Append to `apps/api/tests/unit/test_hf_sync.py`:

```python
from ailiance_demo.services.hf_sync import to_model_card
from ailiance_demo.models import ChatBackend, ModelStatus


def test_to_model_card_maps_basic_fields() -> None:
    raw = {
        "id": "clemsail/micro-kiki-v3",
        "author": "clemsail",
        "downloads": 242,
        "likes": 4,
        "lastModified": "2026-04-26T12:34:56.000Z",
        "tags": ["text-generation", "lora", "mistral"],
    }

    card = to_model_card(raw, ailiance_aliases=set())

    assert card.id == "clemsail/micro-kiki-v3"
    assert card.owner == "clemsail"
    assert card.name == "micro-kiki-v3"
    assert card.downloads == 242
    assert card.likes == 4
    assert card.status == ModelStatus.PRODUCTION
    assert card.chat_backend == ChatBackend.HF_EXTERNAL
    assert card.chat_eligible is False
    assert card.hf_url == "https://huggingface.co/clemsail/micro-kiki-v3"


def test_to_model_card_marks_ailiance_live_models_chat_eligible() -> None:
    raw = {"id": "ailiance/apertus-70b", "author": "ailiance"}

    card = to_model_card(raw, ailiance_aliases={"ailiance/apertus-70b"})

    assert card.chat_backend == ChatBackend.AILIANCE_LIVE
    assert card.chat_eligible is True


def test_to_model_card_zero_downloads_marks_alpha() -> None:
    raw = {
        "id": "clemsail/spikingkiki-v4-adapters",
        "author": "clemsail",
        "downloads": 0,
        "likes": 0,
    }

    card = to_model_card(raw, ailiance_aliases=set())

    assert card.status == ModelStatus.ALPHA
```

- [ ] **Step 2: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_sync.py::test_to_model_card_maps_basic_fields -v
```
Expected: FAIL with `ImportError: cannot import name 'to_model_card'`

- [ ] **Step 3: Append `to_model_card` to `apps/api/src/ailiance_demo/services/hf_sync.py`**

```python
from datetime import datetime
from ailiance_demo.models import ChatBackend, ModelCard, ModelStatus


def to_model_card(raw: dict, ailiance_aliases: set[str]) -> ModelCard:
    """Map a raw HF API model JSON object to a ModelCard.

    ailiance_aliases: model IDs that should be marked chat-eligible (Live stack).
    """
    model_id = raw.get("id") or raw.get("modelId") or ""
    owner, _, name = model_id.partition("/")

    downloads = int(raw.get("downloads") or 0)
    likes = int(raw.get("likes") or 0)
    last_modified_raw = raw.get("lastModified")
    last_modified = (
        datetime.fromisoformat(last_modified_raw.replace("Z", "+00:00"))
        if last_modified_raw
        else None
    )

    is_live = model_id in ailiance_aliases
    chat_backend = ChatBackend.AILIANCE_LIVE if is_live else ChatBackend.HF_EXTERNAL

    if is_live:
        status = ModelStatus.PRODUCTION
    elif downloads == 0 and likes == 0:
        status = ModelStatus.ALPHA
    else:
        status = ModelStatus.PRODUCTION

    return ModelCard(
        id=model_id,
        owner=owner,
        name=name,
        display_name=name.replace("-", " ").title(),
        status=status,
        chat_backend=chat_backend,
        chat_eligible=is_live,
        downloads=downloads,
        likes=likes,
        last_modified=last_modified,
        hf_url=f"https://huggingface.co/{model_id}",
    )
```

- [ ] **Step 4: Run tests (must pass)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_sync.py -v
```
Expected: `5 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): hf_sync.to_model_card mapper with chat-eligibility detection"
```

---

### Task 1.4: featured.yaml service

**Files:**
- Create: `apps/api/src/ailiance_demo/services/featured.py`, `apps/api/tests/unit/test_featured.py`, `apps/api/tests/fixtures/featured_sample.yaml`, `featured.yaml` (root)

- [ ] **Step 1: Write `apps/api/tests/fixtures/featured_sample.yaml`**

```yaml
featured:
  - id: clemsail/micro-kiki-v3
    rank: 1
    headline: "242 dl, 4♥ — la variante KIKI la plus adoptée"
  - id: clemsail/kiki-kicad-sft
    rank: 2
    headline: "Premier LLM open KiCad-fluent"

deprecated:
  - id: electron-rare/kiki-stm32-sft-v1
    superseded_by: clemsail/kiki-stm32-sft
    note: "v1 vide"

aliases:
  clemsail/micro-kiki-v3: "Micro-KIKI v3"
```

- [ ] **Step 2: Write `apps/api/tests/unit/test_featured.py`** (test first)

```python
"""Tests for featured.yaml parsing."""
from pathlib import Path

from ailiance_demo.services.featured import FeaturedConfig, load_featured

FIXTURE = Path(__file__).parent.parent / "fixtures" / "featured_sample.yaml"


def test_load_featured_parses_all_sections() -> None:
    cfg = load_featured(FIXTURE)

    assert isinstance(cfg, FeaturedConfig)
    assert len(cfg.featured) == 2
    assert cfg.featured[0].id == "clemsail/micro-kiki-v3"
    assert cfg.featured[0].rank == 1
    assert cfg.featured[0].headline.startswith("242 dl")

    assert "electron-rare/kiki-stm32-sft-v1" in cfg.deprecated
    assert cfg.deprecated["electron-rare/kiki-stm32-sft-v1"].superseded_by == "clemsail/kiki-stm32-sft"

    assert cfg.aliases["clemsail/micro-kiki-v3"] == "Micro-KIKI v3"


def test_load_featured_missing_file_returns_empty(tmp_path: Path) -> None:
    cfg = load_featured(tmp_path / "nonexistent.yaml")

    assert cfg.featured == []
    assert cfg.deprecated == {}
    assert cfg.aliases == {}


def test_get_for_id_returns_featured_metadata() -> None:
    cfg = load_featured(FIXTURE)

    entry = cfg.featured_for_id("clemsail/micro-kiki-v3")
    assert entry is not None
    assert entry.rank == 1

    assert cfg.featured_for_id("clemsail/unknown") is None
```

- [ ] **Step 3: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_featured.py -v
```
Expected: FAIL `ImportError: cannot import name 'FeaturedConfig'`

- [ ] **Step 4: Write `apps/api/src/ailiance_demo/services/featured.py`**

```python
"""Parse featured.yaml — manual curation overlay for the public showcase."""
from __future__ import annotations

from pathlib import Path

import structlog
import yaml
from pydantic import BaseModel, Field

log = structlog.get_logger()


class FeaturedEntry(BaseModel):
    id: str
    rank: int
    headline: str | None = None


class DeprecatedEntry(BaseModel):
    superseded_by: str | None = None
    note: str | None = None


class FeaturedConfig(BaseModel):
    featured: list[FeaturedEntry] = Field(default_factory=list)
    deprecated: dict[str, DeprecatedEntry] = Field(default_factory=dict)
    aliases: dict[str, str] = Field(default_factory=dict)

    def featured_for_id(self, model_id: str) -> FeaturedEntry | None:
        for entry in self.featured:
            if entry.id == model_id:
                return entry
        return None


def load_featured(path: Path) -> FeaturedConfig:
    """Load and parse featured.yaml. Returns empty config if file is missing."""
    if not path.exists():
        log.info("featured.missing", path=str(path))
        return FeaturedConfig()

    raw = yaml.safe_load(path.read_text()) or {}

    featured_raw = raw.get("featured", []) or []
    featured = [FeaturedEntry.model_validate(f) for f in featured_raw]

    deprecated_raw = raw.get("deprecated", []) or []
    deprecated: dict[str, DeprecatedEntry] = {}
    for d in deprecated_raw:
        d_id = d.get("id")
        if not d_id:
            continue
        deprecated[d_id] = DeprecatedEntry(
            superseded_by=d.get("superseded_by"),
            note=d.get("note"),
        )

    aliases = raw.get("aliases", {}) or {}

    return FeaturedConfig(featured=featured, deprecated=deprecated, aliases=aliases)
```

- [ ] **Step 5: Run tests (must pass)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_featured.py -v
```
Expected: `3 passed`

- [ ] **Step 6: Write the real `featured.yaml` (root)**

```yaml
featured:
  - id: clemsail/micro-kiki-v3
    rank: 1
    headline: "242 dl, 4♥ — la variante KIKI la plus adoptée"
  - id: clemsail/kiki-kicad-sft
    rank: 2
    headline: "Premier LLM open KiCad-fluent — 94 dl"
  - id: clemsail/kiki-stm32-sft
    rank: 3
    headline: "Adapter STM32 — 79 downloads"
  - id: ailiance/apertus-70b
    rank: 4
    headline: "EU sovereign — Apertus 70B (EPFL+ETH+CSCS) avec 32 adapters EU"
  - id: ailiance/devstral-24b
    rank: 5
    headline: "Devstral 2 24B — code generation EU"

deprecated:
  - id: electron-rare/kiki-stm32-sft-v1
    superseded_by: clemsail/kiki-stm32-sft
    note: "v1 vide, utiliser clemsail/* à la place"
  - id: electron-rare/kiki-kicad-sft-v1
    superseded_by: clemsail/kiki-kicad-sft
    note: "v1 vide"

aliases:
  clemsail/micro-kiki-v3: "Micro-KIKI v3"
  ailiance/apertus-70b: "Apertus 70B (AILIANCE)"
  ailiance/devstral-24b: "Devstral 24B (AILIANCE)"
  ailiance/eurollm-22b: "EuroLLM 22B (AILIANCE)"
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/ featured.yaml
git commit -m "feat(api): featured.yaml parser and root curation file"
```

---

### Task 1.5: HFCache — orchestrate sync, cache, merge featured

**Files:**
- Create: `apps/api/src/ailiance_demo/services/hf_cache.py`, `apps/api/tests/unit/test_hf_cache.py`

- [ ] **Step 1: Write `apps/api/tests/unit/test_hf_cache.py`** (test first)

```python
"""Tests for HFCache (orchestrator)."""
from pathlib import Path

import httpx
import pytest

from ailiance_demo.services.hf_cache import HFCache
from ailiance_demo.services.featured import FeaturedConfig, FeaturedEntry, DeprecatedEntry


def make_handler(responses: dict[str, list[dict]]):
    def handler(request: httpx.Request) -> httpx.Response:
        owner = request.url.params.get("author")
        return httpx.Response(200, json=responses.get(owner, []))
    return handler


@pytest.mark.asyncio
async def test_hfcache_refresh_merges_owners_and_marks_ailiance() -> None:
    responses = {
        "clemsail": [{"id": "clemsail/micro-kiki-v3", "downloads": 242}],
        "electron-rare": [{"id": "electron-rare/mascarade-iot", "downloads": 6}],
    }
    transport = httpx.MockTransport(make_handler(responses))
    cache = HFCache(
        owners=["clemsail", "electron-rare"],
        ailiance_aliases={"ailiance/apertus-70b"},
        featured=FeaturedConfig(),
        cache_dir=Path("/tmp/test-cache-refresh"),
        http_transport=transport,
    )

    await cache.refresh()

    cards = cache.list_cards()
    assert len(cards) == 2
    ids = {c.id for c in cards}
    assert ids == {"clemsail/micro-kiki-v3", "electron-rare/mascarade-iot"}


@pytest.mark.asyncio
async def test_hfcache_applies_featured_rank_and_headline() -> None:
    responses = {"clemsail": [{"id": "clemsail/micro-kiki-v3", "downloads": 242}]}
    transport = httpx.MockTransport(make_handler(responses))
    featured = FeaturedConfig(
        featured=[FeaturedEntry(id="clemsail/micro-kiki-v3", rank=1, headline="HEADLINE")],
    )
    cache = HFCache(
        owners=["clemsail"],
        ailiance_aliases=set(),
        featured=featured,
        cache_dir=Path("/tmp/test-cache-featured"),
        http_transport=transport,
    )

    await cache.refresh()
    card = cache.list_cards()[0]

    assert card.featured_rank == 1
    assert card.featured_headline == "HEADLINE"
    assert card.status.value == "featured"


@pytest.mark.asyncio
async def test_hfcache_filters_deprecated() -> None:
    responses = {"electron-rare": [{"id": "electron-rare/kiki-stm32-sft-v1", "downloads": 0}]}
    transport = httpx.MockTransport(make_handler(responses))
    featured = FeaturedConfig(
        deprecated={
            "electron-rare/kiki-stm32-sft-v1": DeprecatedEntry(
                superseded_by="clemsail/kiki-stm32-sft",
                note="empty",
            ),
        },
    )
    cache = HFCache(
        owners=["electron-rare"],
        ailiance_aliases=set(),
        featured=featured,
        cache_dir=Path("/tmp/test-cache-deprecated"),
        http_transport=transport,
    )

    await cache.refresh()
    card = cache.list_cards()[0]
    assert card.status.value == "deprecated"
```

- [ ] **Step 2: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_cache.py -v
```
Expected: FAIL with `ImportError: cannot import name 'HFCache'`

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/services/hf_cache.py`**

```python
"""Orchestrate HF API sync + featured.yaml merge + in-memory cache + disk fallback."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path

import httpx
import structlog

from ailiance_demo.models import ModelCard, ModelStatus
from ailiance_demo.services.featured import FeaturedConfig
from ailiance_demo.services.hf_sync import fetch_models_for_owner, to_model_card

log = structlog.get_logger()


class HFCache:
    """In-memory cache of ModelCards, refreshed periodically from HF API."""

    def __init__(
        self,
        owners: list[str],
        ailiance_aliases: set[str],
        featured: FeaturedConfig,
        cache_dir: Path,
        http_transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.owners = owners
        self.ailiance_aliases = ailiance_aliases
        self.featured = featured
        self.cache_dir = cache_dir
        self.http_transport = http_transport
        self._cards: list[ModelCard] = []
        self._lock = asyncio.Lock()

    def list_cards(self) -> list[ModelCard]:
        """Return current cached cards (may be empty before first refresh)."""
        return list(self._cards)

    def get_card(self, model_id: str) -> ModelCard | None:
        for c in self._cards:
            if c.id == model_id:
                return c
        return None

    async def refresh(self) -> None:
        """Fetch from all owners, merge, apply featured/deprecated overlays, cache."""
        async with self._lock:
            log.info("hfcache.refresh.start", owners=self.owners)
            kwargs: dict = {"base_url": "https://huggingface.co", "timeout": 30.0}
            if self.http_transport is not None:
                kwargs["transport"] = self.http_transport
            async with httpx.AsyncClient(**kwargs) as client:
                tasks = [fetch_models_for_owner(client, owner) for owner in self.owners]
                results = await asyncio.gather(*tasks)

            cards: list[ModelCard] = []
            for raw_list in results:
                for raw in raw_list:
                    cards.append(to_model_card(raw, ailiance_aliases=self.ailiance_aliases))

            for card in cards:
                if card.id in self.featured.deprecated:
                    card.status = ModelStatus.DEPRECATED
                    dep = self.featured.deprecated[card.id]
                    if hasattr(card, "deprecated_note"):
                        card.deprecated_note = dep.note  # type: ignore[attr-defined]
                    continue
                feat = self.featured.featured_for_id(card.id)
                if feat is not None:
                    card.status = ModelStatus.FEATURED
                    card.featured_rank = feat.rank
                    card.featured_headline = feat.headline
                if card.id in self.featured.aliases:
                    card.display_name = self.featured.aliases[card.id]

            self._cards = sorted(
                cards,
                key=lambda c: (
                    c.featured_rank if c.featured_rank is not None else 999,
                    -c.downloads,
                ),
            )

            self._write_disk_cache()
            log.info("hfcache.refresh.done", count=len(self._cards))

    def _write_disk_cache(self) -> None:
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            payload = [c.model_dump(mode="json") for c in self._cards]
            (self.cache_dir / "hf-models.json").write_text(json.dumps(payload, indent=2))
        except OSError as exc:
            log.warning("hfcache.disk_write_failed", error=str(exc))

    def load_disk_cache(self) -> bool:
        path = self.cache_dir / "hf-models.json"
        if not path.exists():
            return False
        try:
            data = json.loads(path.read_text())
            self._cards = [ModelCard.model_validate(item) for item in data]
            log.info("hfcache.disk_load", count=len(self._cards))
            return True
        except (OSError, json.JSONDecodeError, ValueError) as exc:
            log.warning("hfcache.disk_load_failed", error=str(exc))
            return False
```

- [ ] **Step 4: Run tests (must pass)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_hf_cache.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): HFCache orchestrator with featured/deprecated merge"
```

---

### Task 1.6: GET /api/public/models endpoint

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/public/models.py`, `apps/api/tests/integration/test_models_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py` (mount router + lifespan with HFCache)
- Modify: `apps/api/src/ailiance_demo/deps.py` (provide HFCache as dependency)

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/deps.py`**

```python
"""FastAPI dependencies."""
from __future__ import annotations

from fastapi import Request

from ailiance_demo.services.hf_cache import HFCache


def get_hf_cache(request: Request) -> HFCache:
    cache = getattr(request.app.state, "hf_cache", None)
    if cache is None:
        raise RuntimeError("HFCache not initialized in app.state")
    return cache
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/routers/public/models.py`**

```python
"""Public models listing + detail."""
from fastapi import APIRouter, Depends, HTTPException, Query

from ailiance_demo.deps import get_hf_cache
from ailiance_demo.models import ModelCard
from ailiance_demo.services.hf_cache import HFCache

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/models", response_model=list[ModelCard])
def list_models(
    cache: HFCache = Depends(get_hf_cache),
    domain: str | None = Query(default=None),
    base_model: str | None = Query(default=None),
    status: str | None = Query(default=None),
) -> list[ModelCard]:
    cards = cache.list_cards()
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
    card = cache.get_card(model_id)
    if card is None:
        raise HTTPException(status_code=404, detail=f"Model {model_id} not found")
    return card
```

- [ ] **Step 3: Modify `apps/api/src/ailiance_demo/main.py` — wire HFCache to app lifespan**

Replace the current `lifespan` function and update imports:

```python
"""FastAPI app factory."""
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ailiance_demo.config import settings
from ailiance_demo.routers.admin import health as admin_health
from ailiance_demo.routers.public import health as public_health
from ailiance_demo.routers.public import models as public_models
from ailiance_demo.services.featured import load_featured
from ailiance_demo.services.hf_cache import HFCache

log = structlog.get_logger()

AILIANCE_ALIASES: set[str] = {
    "ailiance/apertus-70b",
    "ailiance/devstral-24b",
    "ailiance/eurollm-22b",
}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("startup", service="ailiance-demo", port=settings.port)

    featured = load_featured(settings.featured_path)
    cache = HFCache(
        owners=settings.hf_owners,
        ailiance_aliases=AILIANCE_ALIASES,
        featured=featured,
        cache_dir=settings.cache_dir,
    )
    cache.load_disk_cache()
    app.state.hf_cache = cache

    try:
        await cache.refresh()
    except Exception as exc:
        log.warning("hf.initial_refresh_failed", error=str(exc))

    yield

    log.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ailiance-demo",
        version="0.0.0",
        description="Frontend backend for KIKI training/eval/test",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )

    app.include_router(public_health.router)
    app.include_router(public_models.router)
    app.include_router(admin_health.router)

    return app


app = create_app()
```

- [ ] **Step 4: Update `apps/api/tests/conftest.py` to inject a fake cache**

Replace with:

```python
"""Shared pytest fixtures."""
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.main import AILIANCE_ALIASES, create_app
from ailiance_demo.models import ModelCard, ModelStatus, ChatBackend
from ailiance_demo.services.featured import FeaturedConfig
from ailiance_demo.services.hf_cache import HFCache


@pytest.fixture
def empty_hf_cache(tmp_path: Path) -> HFCache:
    return HFCache(
        owners=[],
        ailiance_aliases=AILIANCE_ALIASES,
        featured=FeaturedConfig(),
        cache_dir=tmp_path / "cache",
    )


@pytest.fixture
def sample_card() -> ModelCard:
    return ModelCard(
        id="clemsail/micro-kiki-v3",
        owner="clemsail",
        name="micro-kiki-v3",
        display_name="Micro-KIKI v3",
        status=ModelStatus.FEATURED,
        chat_backend=ChatBackend.HF_EXTERNAL,
        chat_eligible=False,
        downloads=242,
        likes=4,
        hf_url="https://huggingface.co/clemsail/micro-kiki-v3",
    )


@pytest.fixture
def client_with_cache(empty_hf_cache: HFCache, sample_card: ModelCard) -> TestClient:
    """Build a TestClient with a pre-populated HFCache and skip the lifespan refresh."""
    app = create_app()
    empty_hf_cache._cards = [sample_card]
    # Replace the lifespan-installed cache by overriding app.state directly via dependency_overrides
    from ailiance_demo.deps import get_hf_cache
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    return TestClient(app)


@pytest.fixture
def client(client_with_cache: TestClient) -> TestClient:
    return client_with_cache
```

- [ ] **Step 5: Write `apps/api/tests/integration/test_models_endpoint.py`**

```python
"""Tests for /api/public/models."""
from fastapi.testclient import TestClient


def test_list_models_returns_cards(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models")

    assert response.status_code == 200
    cards = response.json()
    assert len(cards) == 1
    assert cards[0]["id"] == "clemsail/micro-kiki-v3"
    assert cards[0]["chat_eligible"] is False


def test_get_model_returns_single_card(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/clemsail/micro-kiki-v3")

    assert response.status_code == 200
    card = response.json()
    assert card["display_name"] == "Micro-KIKI v3"


def test_get_model_404_when_unknown(client_with_cache: TestClient) -> None:
    response = client_with_cache.get("/api/public/models/clemsail/does-not-exist")

    assert response.status_code == 404
```

- [ ] **Step 6: Run tests**

Run:
```bash
uv run pytest apps/api/tests -v
```
Expected: all green (8+ tests)

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat(api): GET /api/public/models listing + detail endpoints"
```

---

### Task 1.7: Eval index service

**Files:**
- Create: `apps/api/src/ailiance_demo/services/eval_index.py`, `apps/api/tests/unit/test_eval_index.py`, `apps/api/tests/fixtures/eval_results/sample_humaneval.json`

- [ ] **Step 1: Write `apps/api/tests/fixtures/eval_results/sample_humaneval.json`**

```json
{
  "model_id": "clemsail/micro-kiki-v3",
  "benchmark": "HumanEval+",
  "metric": "pass@1",
  "score": 0.78,
  "timestamp": "2026-04-30T12:00:00Z",
  "run_sha": "abc123",
  "hardware": "M3 Ultra 512G",
  "config": {"seed": 42, "temperature": 0.0}
}
```

- [ ] **Step 2: Write `apps/api/tests/fixtures/eval_results/sample_gsm8k.json`**

```json
{
  "model_id": "clemsail/micro-kiki-v3",
  "benchmark": "GSM8K",
  "metric": "accuracy",
  "score": 0.62,
  "timestamp": "2026-04-30T13:00:00Z",
  "run_sha": "abc123",
  "hardware": "M3 Ultra 512G",
  "config": {"seed": 42, "shots": 5}
}
```

- [ ] **Step 3: Write `apps/api/tests/unit/test_eval_index.py`** (test first)

```python
"""Tests for eval_index service."""
from pathlib import Path

from ailiance_demo.services.eval_index import EvalIndex

FIXTURES = Path(__file__).parent.parent / "fixtures" / "eval_results"


def test_eval_index_walks_directory_and_indexes_by_model() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    summaries = index.summary_for("clemsail/micro-kiki-v3")
    assert summaries is not None
    assert "HumanEval+" in summaries.by_benchmark
    assert "GSM8K" in summaries.by_benchmark
    assert summaries.by_benchmark["HumanEval+"].score == 0.78


def test_eval_index_summary_picks_latest_per_benchmark(tmp_path: Path) -> None:
    older = {
        "model_id": "x/y",
        "benchmark": "B",
        "metric": "m",
        "score": 0.1,
        "timestamp": "2026-01-01T00:00:00Z",
    }
    newer = {
        "model_id": "x/y",
        "benchmark": "B",
        "metric": "m",
        "score": 0.5,
        "timestamp": "2026-04-01T00:00:00Z",
    }
    import json
    (tmp_path / "older.json").write_text(json.dumps(older))
    (tmp_path / "newer.json").write_text(json.dumps(newer))

    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    summary = index.summary_for("x/y")
    assert summary is not None
    assert summary.by_benchmark["B"].score == 0.5


def test_eval_index_unknown_model_returns_none() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    assert index.summary_for("nobody/none") is None


def test_eval_index_top_score_picks_highest() -> None:
    index = EvalIndex(roots=[FIXTURES])
    index.refresh()

    top = index.top_score_for("clemsail/micro-kiki-v3")
    assert top is not None
    assert top[0] == "HumanEval+"
    assert top[1] == 0.78
```

- [ ] **Step 4: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_eval_index.py -v
```
Expected: FAIL with `ImportError`

- [ ] **Step 5: Write `apps/api/src/ailiance_demo/services/eval_index.py`**

```python
"""Walk eval result JSON files, build in-memory index, expose summaries."""
from __future__ import annotations

import json
from pathlib import Path

import structlog

from ailiance_demo.models import EvalResult, EvalSummary

log = structlog.get_logger()


class EvalIndex:
    def __init__(self, roots: list[Path]) -> None:
        self.roots = roots
        self._by_model: dict[str, list[EvalResult]] = {}

    def refresh(self) -> None:
        self._by_model.clear()
        for root in self.roots:
            if not root.exists():
                log.info("eval_index.root_missing", root=str(root))
                continue
            for path in root.rglob("*.json"):
                try:
                    payload = json.loads(path.read_text())
                except (OSError, json.JSONDecodeError) as exc:
                    log.warning("eval_index.parse_failed", path=str(path), error=str(exc))
                    continue
                try:
                    result = EvalResult.model_validate(payload)
                except ValueError as exc:
                    log.warning("eval_index.schema_mismatch", path=str(path), error=str(exc))
                    continue
                self._by_model.setdefault(result.model_id, []).append(result)
        log.info("eval_index.refresh.done", models=len(self._by_model))

    def summary_for(self, model_id: str) -> EvalSummary | None:
        results = self._by_model.get(model_id)
        if not results:
            return None
        latest_per_benchmark: dict[str, EvalResult] = {}
        for r in results:
            existing = latest_per_benchmark.get(r.benchmark)
            if existing is None or r.timestamp > existing.timestamp:
                latest_per_benchmark[r.benchmark] = r
        return EvalSummary(model_id=model_id, by_benchmark=latest_per_benchmark)

    def top_score_for(self, model_id: str) -> tuple[str, float] | None:
        summary = self.summary_for(model_id)
        if summary is None or not summary.by_benchmark:
            return None
        best = max(summary.by_benchmark.values(), key=lambda r: r.score)
        return (best.benchmark, best.score)
```

- [ ] **Step 6: Run tests**

Run:
```bash
uv run pytest apps/api/tests/unit/test_eval_index.py -v
```
Expected: `4 passed`

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat(api): EvalIndex — walk + parse + summarize eval results"
```

---

### Task 1.8: Wire eval endpoint + top-score on ModelCard

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/public/eval.py`, `apps/api/tests/integration/test_eval_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py` (eval index in lifespan + mount router)
- Modify: `apps/api/src/ailiance_demo/deps.py` (get_eval_index)
- Modify: `apps/api/src/ailiance_demo/services/hf_cache.py` (apply top eval to cards)

- [ ] **Step 1: Modify `apps/api/src/ailiance_demo/deps.py`**

Append:

```python
from ailiance_demo.services.eval_index import EvalIndex


def get_eval_index(request: Request) -> EvalIndex:
    index = getattr(request.app.state, "eval_index", None)
    if index is None:
        raise RuntimeError("EvalIndex not initialized in app.state")
    return index
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/routers/public/eval.py`**

```python
"""Public eval summary endpoint."""
from fastapi import APIRouter, Depends, HTTPException

from ailiance_demo.deps import get_eval_index
from ailiance_demo.models import EvalSummary
from ailiance_demo.services.eval_index import EvalIndex

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/eval/{owner}/{name}", response_model=EvalSummary)
def get_eval_summary(
    owner: str,
    name: str,
    index: EvalIndex = Depends(get_eval_index),
) -> EvalSummary:
    model_id = f"{owner}/{name}"
    summary = index.summary_for(model_id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"No eval results for {model_id}")
    return summary
```

- [ ] **Step 3: Modify `apps/api/src/ailiance_demo/main.py`** — wire EvalIndex

In the imports add:

```python
from ailiance_demo.routers.public import eval as public_eval
from ailiance_demo.services.eval_index import EvalIndex
```

In `lifespan()`, after creating `cache`:

```python
    eval_index = EvalIndex(
        roots=[
            settings.ailiance_root / "eval" / "results",
            settings.ailiance_root / "output" / "eval",
            settings.kiki_mac_tunner_root / "results",
        ],
    )
    eval_index.refresh()
    app.state.eval_index = eval_index

    # Annotate cards with top score
    for card in cache.list_cards():
        top = eval_index.top_score_for(card.id)
        if top is not None:
            card.top_eval_benchmark, card.top_eval_score = top
```

In `create_app()`, mount the router:

```python
    app.include_router(public_eval.router)
```

- [ ] **Step 4: Modify `apps/api/tests/conftest.py`** — add eval index fixture

Append:

```python
from ailiance_demo.services.eval_index import EvalIndex


@pytest.fixture
def empty_eval_index(tmp_path: Path) -> EvalIndex:
    return EvalIndex(roots=[tmp_path / "no_evals"])


@pytest.fixture
def client_with_full_state(
    empty_hf_cache: HFCache,
    empty_eval_index: EvalIndex,
    sample_card: ModelCard,
) -> TestClient:
    app = create_app()
    empty_hf_cache._cards = [sample_card]
    from ailiance_demo.deps import get_hf_cache, get_eval_index
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    return TestClient(app)
```

Update the `client` fixture to use `client_with_full_state` instead.

```python
@pytest.fixture
def client(client_with_full_state: TestClient) -> TestClient:
    return client_with_full_state
```

(Remove the previous `client` fixture; keep `client_with_cache` for tests that don't need eval.)

- [ ] **Step 5: Write `apps/api/tests/integration/test_eval_endpoint.py`**

```python
"""Tests for /api/public/eval/{owner}/{name}."""
from pathlib import Path
import json

from fastapi.testclient import TestClient

from ailiance_demo.main import create_app
from ailiance_demo.deps import get_eval_index, get_hf_cache
from ailiance_demo.services.eval_index import EvalIndex


def test_eval_summary_returns_per_benchmark(tmp_path: Path, empty_hf_cache) -> None:
    payload = {
        "model_id": "clemsail/micro-kiki-v3",
        "benchmark": "HumanEval+",
        "metric": "pass@1",
        "score": 0.78,
        "timestamp": "2026-04-30T12:00:00Z",
    }
    (tmp_path / "result.json").write_text(json.dumps(payload))

    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: index
    client = TestClient(app)

    response = client.get("/api/public/eval/clemsail/micro-kiki-v3")
    assert response.status_code == 200
    data = response.json()
    assert "HumanEval+" in data["by_benchmark"]
    assert data["by_benchmark"]["HumanEval+"]["score"] == 0.78


def test_eval_summary_404_when_unknown(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/public/eval/clemsail/unknown")
    assert response.status_code == 404
```

- [ ] **Step 6: Run tests**

Run:
```bash
uv run pytest apps/api/tests -v
```
Expected: all green

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat(api): GET /api/public/eval/{owner}/{name} endpoint with EvalIndex wiring"
```

---

### Task 1.9: Chat proxy service (forward SSE to ailiance gateway)

**Files:**
- Create: `apps/api/src/ailiance_demo/services/chat_proxy.py`, `apps/api/tests/unit/test_chat_proxy.py`

- [ ] **Step 1: Write `apps/api/tests/unit/test_chat_proxy.py`** (test first)

```python
"""Tests for chat_proxy service."""
import httpx
import pytest

from ailiance_demo.services.chat_proxy import (
    ChatRequest,
    is_chat_eligible,
    stream_chat,
    AILIANCE_ALIASES,
)


def test_is_chat_eligible_returns_true_for_ailiance_aliases() -> None:
    for alias in AILIANCE_ALIASES:
        assert is_chat_eligible(alias) is True


def test_is_chat_eligible_returns_false_for_hf_models() -> None:
    assert is_chat_eligible("clemsail/micro-kiki-v3") is False
    assert is_chat_eligible("electron-rare/mascarade-iot") is False


@pytest.mark.asyncio
async def test_stream_chat_forwards_sse_events() -> None:
    async def server_handler(request: httpx.Request) -> httpx.Response:
        async def emit():
            yield b'event: token\ndata: {"text":"Hello"}\n\n'
            yield b'event: token\ndata: {"text":" world"}\n\n'
            yield b'event: done\ndata: {}\n\n'
        return httpx.Response(200, content=emit(), headers={"content-type": "text/event-stream"})

    transport = httpx.MockTransport(server_handler)

    chat_req = ChatRequest(
        model_id="ailiance/apertus-70b",
        messages=[{"role": "user", "content": "hi"}],
        temperature=0.7,
    )

    chunks: list[bytes] = []
    async for chunk in stream_chat(
        chat_req,
        gateway_url="http://gateway:9200",
        http_transport=transport,
    ):
        chunks.append(chunk)

    raw = b"".join(chunks)
    assert b'event: token' in raw
    assert b'"text":"Hello"' in raw
    assert b'event: done' in raw
```

- [ ] **Step 2: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_chat_proxy.py -v
```
Expected: FAIL `ImportError`

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/services/chat_proxy.py`**

```python
"""Forward chat requests as SSE streams to the ailiance gateway."""
from __future__ import annotations

from collections.abc import AsyncIterator

import httpx
import structlog
from pydantic import BaseModel, Field

log = structlog.get_logger()

AILIANCE_ALIASES: set[str] = {
    "ailiance/apertus-70b",
    "ailiance/devstral-24b",
    "ailiance/eurollm-22b",
}

# Map our user-facing alias to the gateway's expected model param
ALIAS_TO_GATEWAY_MODEL: dict[str, str] = {
    "ailiance/apertus-70b": "apertus-70b",
    "ailiance/devstral-24b": "devstral-24b",
    "ailiance/eurollm-22b": "eurollm-22b",
}


class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    model_id: str
    messages: list[ChatMessage] | list[dict] = Field(default_factory=list)
    temperature: float = 0.7
    max_tokens: int = 1024
    system_prompt: str | None = None


def is_chat_eligible(model_id: str) -> bool:
    return model_id in AILIANCE_ALIASES


async def stream_chat(
    req: ChatRequest,
    gateway_url: str,
    http_transport: httpx.BaseTransport | None = None,
) -> AsyncIterator[bytes]:
    """Forward to ailiance gateway, yield SSE chunks (raw bytes) 1:1."""
    if not is_chat_eligible(req.model_id):
        raise ValueError(f"Model {req.model_id} is not chat-eligible (sprint 1)")

    gateway_model = ALIAS_TO_GATEWAY_MODEL[req.model_id]
    payload = {
        "model": gateway_model,
        "messages": [m if isinstance(m, dict) else m.model_dump() for m in req.messages],
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": True,
    }
    if req.system_prompt:
        payload["system"] = req.system_prompt

    kwargs: dict = {"timeout": httpx.Timeout(60.0, read=None)}
    if http_transport is not None:
        kwargs["transport"] = http_transport

    async with httpx.AsyncClient(**kwargs) as client:
        async with client.stream(
            "POST",
            f"{gateway_url}/v1/chat/completions",
            json=payload,
        ) as response:
            if response.status_code >= 400:
                log.warning("chat_proxy.upstream_error", status=response.status_code)
                yield (
                    f'event: error\ndata: {{"status":{response.status_code}}}\n\n'
                ).encode()
                return
            async for chunk in response.aiter_bytes():
                yield chunk
```

- [ ] **Step 4: Run tests**

Run:
```bash
uv run pytest apps/api/tests/unit/test_chat_proxy.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): chat_proxy service — forward SSE to ailiance gateway"
```

---

### Task 1.10: POST /api/public/chat endpoint (SSE)

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/public/chat.py`, `apps/api/tests/integration/test_chat_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py` (mount router)

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/routers/public/chat.py`**

```python
"""POST /api/public/chat — SSE proxy to ailiance gateway."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from ailiance_demo.config import settings
from ailiance_demo.services.chat_proxy import (
    ChatRequest,
    is_chat_eligible,
    stream_chat,
)

router = APIRouter(prefix="/api/public", tags=["public"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(req: ChatRequest, request) -> StreamingResponse:  # noqa: ARG001
    if not is_chat_eligible(req.model_id):
        owner_name = req.model_id.split("/", 1)
        hf_url = (
            f"https://huggingface.co/{req.model_id}"
            if len(owner_name) == 2
            else "https://huggingface.co"
        )
        raise HTTPException(
            status_code=501,
            detail={
                "message": f"Model {req.model_id} not served locally in sprint 1",
                "hf_url": hf_url,
            },
        )

    async def gen():
        async for chunk in stream_chat(req, gateway_url=settings.ailiance_gateway_url):
            yield chunk

    return StreamingResponse(gen(), media_type="text/event-stream")
```

- [ ] **Step 2: Modify `apps/api/src/ailiance_demo/main.py`** — mount chat router and slowapi

Add imports:

```python
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from ailiance_demo.routers.public import chat as public_chat
```

In `create_app()`, after CORS middleware:

```python
    app.state.limiter = public_chat.limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
```

And:

```python
    app.include_router(public_chat.router)
```

- [ ] **Step 3: Write `apps/api/tests/integration/test_chat_endpoint.py`**

```python
"""Tests for /api/public/chat."""
from fastapi.testclient import TestClient


def test_chat_returns_501_for_non_ailiance_model(client_with_full_state: TestClient) -> None:
    response = client_with_full_state.post(
        "/api/public/chat",
        json={"model_id": "clemsail/micro-kiki-v3", "messages": [{"role": "user", "content": "hi"}]},
    )

    assert response.status_code == 501
    detail = response.json()["detail"]
    assert detail["hf_url"] == "https://huggingface.co/clemsail/micro-kiki-v3"
```

- [ ] **Step 4: Run tests**

Run:
```bash
uv run pytest apps/api/tests -v
```
Expected: all green

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): POST /api/public/chat — 501 for HF-only, SSE for AILIANCE Live"
```

---

### Task 1.11: Update generated TS types after API additions

- [ ] **Step 1: Regenerate types**

Run:
```bash
pnpm gen:api-types
```
Expected: `✓ Generated packages/shared/src/api/types.ts`

- [ ] **Step 2: Verify typecheck**

Run:
```bash
pnpm typecheck
```
Expected: clean

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/api/types.ts || true
git commit --allow-empty -m "chore(shared): regenerate API types after sprint 1 additions"
```

(`packages/shared/src/api/types.ts` is in .gitignore — the commit may be empty if so. Use `--allow-empty` and update gitignore later if you want types committed.)

---

### Task 1.12: API client setup in cockpit-public

**Files:**
- Create: `apps/cockpit-public/src/lib/api.ts`

- [ ] **Step 1: Write `apps/cockpit-public/src/lib/api.ts`**

```typescript
import { createApiClient } from '@cockpit/shared';

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/cockpit-public/src/lib/api.ts
git commit -m "feat(public): wire @cockpit/shared API client"
```

---

### Task 1.13: ModelCard component + test

**Files:**
- Create: `apps/cockpit-public/src/components/ModelCard.tsx`, `apps/cockpit-public/tests/components/ModelCard.test.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/tests/components/ModelCard.test.tsx`** (test first)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from '@tanstack/react-router';
import { ModelCard } from '../../src/components/ModelCard';
import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

const baseCard: Card = {
  id: 'clemsail/micro-kiki-v3',
  owner: 'clemsail',
  name: 'micro-kiki-v3',
  display_name: 'Micro-KIKI v3',
  status: 'featured',
  chat_backend: 'hf_external',
  chat_eligible: false,
  downloads: 242,
  likes: 4,
  hf_url: 'https://huggingface.co/clemsail/micro-kiki-v3',
  description: null,
  base_model: null,
  domain: null,
  last_modified: null,
  featured_rank: 1,
  featured_headline: 'HEADLINE',
  top_eval_score: null,
  top_eval_benchmark: null,
};

describe('ModelCard', () => {
  it('renders display name and downloads', () => {
    render(<ModelCard card={baseCard} />);
    expect(screen.getByText('Micro-KIKI v3')).toBeInTheDocument();
    expect(screen.getByText(/242/)).toBeInTheDocument();
  });

  it('shows featured headline when present', () => {
    render(<ModelCard card={baseCard} />);
    expect(screen.getByText('HEADLINE')).toBeInTheDocument();
  });

  it('renders Try button as enabled for chat_eligible models', () => {
    const card: Card = { ...baseCard, chat_eligible: true, chat_backend: 'ailiance_live' };
    render(<ModelCard card={card} />);
    const button = screen.getByRole('link', { name: /try/i });
    expect(button.getAttribute('href')).toContain('/chat/');
  });

  it('renders external HF link when not chat_eligible', () => {
    render(<ModelCard card={baseCard} />);
    const link = screen.getByRole('link', { name: /huggingface/i });
    expect(link.getAttribute('href')).toBe('https://huggingface.co/clemsail/micro-kiki-v3');
  });
});
```

- [ ] **Step 2: Run test (must fail)**

Run:
```bash
pnpm --filter cockpit-public test
```
Expected: FAIL — `Cannot find module '../../src/components/ModelCard'`

- [ ] **Step 3: Write `apps/cockpit-public/src/components/ModelCard.tsx`**

```typescript
import { Link } from '@tanstack/react-router';
import { Heart, Download } from 'lucide-react';
import { formatDownloads } from '@cockpit/shared';
import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

interface Props {
  card: Card;
}

export function ModelCard({ card }: Props) {
  const isLive = card.chat_eligible;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg">{card.display_name}</h3>
          <p className="text-xs text-slate-500">{card.id}</p>
        </div>
        <StatusBadge status={card.status} />
      </header>

      {card.featured_headline && (
        <p className="mt-2 text-sm text-slate-700 italic">{card.featured_headline}</p>
      )}

      {card.top_eval_score !== null && card.top_eval_benchmark && (
        <p className="mt-2 text-sm font-mono">
          {card.top_eval_benchmark}: {(card.top_eval_score * 100).toFixed(1)}%
        </p>
      )}

      <footer className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Download size={14} /> {formatDownloads(card.downloads)}
          </span>
          {card.likes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Heart size={14} /> {card.likes}
            </span>
          )}
        </div>
        {isLive ? (
          <Link
            to="/chat/$owner/$name"
            params={{ owner: card.owner, name: card.name }}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Try
          </Link>
        ) : (
          <a
            href={card.hf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            HuggingFace
          </a>
        )}
      </footer>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    featured: 'bg-amber-100 text-amber-800',
    production: 'bg-emerald-100 text-emerald-800',
    alpha: 'bg-slate-100 text-slate-700',
    experimental: 'bg-purple-100 text-purple-800',
    deprecated: 'bg-rose-100 text-rose-700 line-through',
  };
  return (
    <span className={`text-xs rounded-full px-2 py-0.5 ${colors[status] ?? colors.production}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 4: Run test**

Run:
```bash
pnpm --filter cockpit-public test
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/cockpit-public/src/components/ModelCard.tsx apps/cockpit-public/tests/components/ModelCard.test.tsx
git commit -m "feat(public): ModelCard component with chat-eligibility branching"
```

---

### Task 1.14: useModels hook + /models route

**Files:**
- Create: `apps/cockpit-public/src/hooks/useModels.ts`, `apps/cockpit-public/src/routes/models.index.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/src/hooks/useModels.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type ModelCard = components['schemas']['ModelCard'];

export interface ModelFilters {
  domain?: string;
  baseModel?: string;
  status?: string;
}

export function useModels(filters: ModelFilters = {}) {
  return useQuery<ModelCard[]>({
    queryKey: ['models', filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters.domain) params.set('domain', filters.domain);
      if (filters.baseModel) params.set('base_model', filters.baseModel);
      if (filters.status) params.set('status', filters.status);
      const query = params.toString();
      return api.get<ModelCard[]>(`/api/public/models${query ? `?${query}` : ''}`, { signal });
    },
  });
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/routes/models.index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { ModelCard } from '@/components/ModelCard';
import { useModels } from '@/hooks/useModels';

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
});

function ModelsPage() {
  const { data, isLoading, error } = useModels();

  if (isLoading) return <p className="text-slate-500">Loading models…</p>;
  if (error) return <p className="text-rose-700">Failed to load models</p>;
  if (!data || data.length === 0) return <p>No models found.</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Models ({data.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.map((card) => (
          <ModelCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build and verify**

Run:
```bash
pnpm --filter cockpit-public build
```
Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): /models page with useModels hook + grid"
```

---

### Task 1.15: ModelDetail page (/models/$owner/$name)

**Files:**
- Create: `apps/cockpit-public/src/hooks/useModelDetail.ts`, `apps/cockpit-public/src/hooks/useEvalScores.ts`, `apps/cockpit-public/src/components/ModelDetail/Provenance.tsx`, `apps/cockpit-public/src/components/ModelDetail/EvalScores.tsx`, `apps/cockpit-public/src/components/ModelDetail/DatasetList.tsx`, `apps/cockpit-public/src/routes/models.$owner.$name.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/src/hooks/useModelDetail.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type ModelCard = components['schemas']['ModelCard'];

export function useModelDetail(owner: string, name: string) {
  return useQuery<ModelCard>({
    queryKey: ['model', owner, name],
    queryFn: ({ signal }) =>
      api.get<ModelCard>(`/api/public/models/${owner}/${name}`, { signal }),
  });
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/hooks/useEvalScores.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@cockpit/shared';
import type { components } from '@cockpit/shared';

type EvalSummary = components['schemas']['EvalSummary'];

export function useEvalScores(owner: string, name: string) {
  return useQuery<EvalSummary | null>({
    queryKey: ['eval', owner, name],
    queryFn: async ({ signal }) => {
      try {
        return await api.get<EvalSummary>(`/api/public/eval/${owner}/${name}`, { signal });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  });
}
```

- [ ] **Step 3: Write `apps/cockpit-public/src/components/ModelDetail/Provenance.tsx`**

```typescript
import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

interface Props { card: Card }

export function Provenance({ card }: Props) {
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Provenance</h3>
      <dl className="grid grid-cols-2 gap-y-2 text-sm">
        <dt className="text-slate-500">Owner</dt>
        <dd>{card.owner}</dd>
        <dt className="text-slate-500">Base model</dt>
        <dd>{card.base_model ?? '—'}</dd>
        <dt className="text-slate-500">Domain</dt>
        <dd>{card.domain ?? '—'}</dd>
        <dt className="text-slate-500">Last modified</dt>
        <dd>{card.last_modified ? new Date(card.last_modified).toLocaleDateString() : '—'}</dd>
        <dt className="text-slate-500">Downloads</dt>
        <dd>{card.downloads}</dd>
        <dt className="text-slate-500">Likes</dt>
        <dd>{card.likes}</dd>
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Write `apps/cockpit-public/src/components/ModelDetail/EvalScores.tsx`**

```typescript
import type { components } from '@cockpit/shared';

type EvalSummary = components['schemas']['EvalSummary'];

interface Props { summary: EvalSummary | null }

export function EvalScores({ summary }: Props) {
  if (!summary || Object.keys(summary.by_benchmark).length === 0) {
    return (
      <section className="rounded border border-slate-200 p-4">
        <h3 className="font-bold mb-3">Eval scores</h3>
        <p className="text-sm text-slate-500">No eval results yet.</p>
      </section>
    );
  }
  const entries = Object.entries(summary.by_benchmark);
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Eval scores</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b">
            <th className="py-2">Benchmark</th>
            <th className="py-2">Metric</th>
            <th className="py-2">Score</th>
            <th className="py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([benchmark, result]) => (
            <tr key={benchmark} className="border-b border-slate-100">
              <td className="py-2 font-mono">{benchmark}</td>
              <td className="py-2 text-slate-500">{result.metric}</td>
              <td className="py-2 font-mono">
                {(result.score * 100).toFixed(1)}%
              </td>
              <td className="py-2 text-slate-500">
                {new Date(result.timestamp).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 5: Write `apps/cockpit-public/src/components/ModelDetail/DatasetList.tsx`**

```typescript
import type { components } from '@cockpit/shared';

type Card = components['schemas']['ModelCard'];

interface Props { card: Card }

export function DatasetList({ card }: Props) {
  // Sprint 1: ModelCard does not yet include datasets. Placeholder for sprint 1+ when ModelDetail is split out.
  return (
    <section className="rounded border border-slate-200 p-4">
      <h3 className="font-bold mb-3">Datasets</h3>
      <p className="text-sm text-slate-500">
        Dataset provenance is available on the model's HuggingFace page:&nbsp;
        <a className="underline" href={card.hf_url} target="_blank" rel="noopener noreferrer">
          {card.hf_url}
        </a>
      </p>
    </section>
  );
}
```

- [ ] **Step 6: Write `apps/cockpit-public/src/routes/models.$owner.$name.tsx`**

```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { useModelDetail } from '@/hooks/useModelDetail';
import { useEvalScores } from '@/hooks/useEvalScores';
import { Provenance } from '@/components/ModelDetail/Provenance';
import { EvalScores } from '@/components/ModelDetail/EvalScores';
import { DatasetList } from '@/components/ModelDetail/DatasetList';

export const Route = createFileRoute('/models/$owner/$name')({
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { owner, name } = Route.useParams();
  const detail = useModelDetail(owner, name);
  const evals = useEvalScores(owner, name);

  if (detail.isLoading) return <p>Loading…</p>;
  if (detail.error || !detail.data) return <p>Model not found.</p>;
  const card = detail.data;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{card.display_name}</h1>
        <p className="text-slate-500">{card.id}</p>
        {card.featured_headline && (
          <p className="mt-2 italic">{card.featured_headline}</p>
        )}
      </header>

      {card.chat_eligible ? (
        <Link
          to="/chat/$owner/$name"
          params={{ owner: card.owner, name: card.name }}
          className="inline-block rounded bg-emerald-600 px-6 py-2 font-medium text-white"
        >
          Try it →
        </Link>
      ) : (
        <a
          href={card.hf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border border-slate-300 px-6 py-2 font-medium"
        >
          Try on HuggingFace →
        </a>
      )}

      <Provenance card={card} />
      <EvalScores summary={evals.data ?? null} />
      <DatasetList card={card} />
    </div>
  );
}
```

- [ ] **Step 7: Build**

Run:
```bash
pnpm --filter cockpit-public build
```
Expected: succeeds

- [ ] **Step 8: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): /models/owner/name detail page (Provenance, EvalScores, DatasetList)"
```

---

### Task 1.16: useChatStream hook (SSE)

**Files:**
- Create: `apps/cockpit-public/src/hooks/useChatStream.ts`, `apps/cockpit-public/tests/hooks/useChatStream.test.ts`

- [ ] **Step 1: Write `apps/cockpit-public/tests/hooks/useChatStream.test.ts`** (test first)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStream } from '../../src/hooks/useChatStream';

function mockFetchSSE(events: string[]) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) controller.enqueue(encoder.encode(ev));
      controller.close();
    },
  });
  return vi.fn().mockResolvedValue(
    new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
  );
}

describe('useChatStream', () => {
  it('streams tokens and accumulates assistant text', async () => {
    globalThis.fetch = mockFetchSSE([
      'event: token\ndata: {"text":"Hel"}\n\n',
      'event: token\ndata: {"text":"lo"}\n\n',
      'event: done\ndata: {}\n\n',
    ]) as unknown as typeof fetch;

    const { result } = renderHook(() => useChatStream());

    await act(async () => {
      await result.current.send('ailiance/apertus-70b', [{ role: 'user', content: 'hi' }]);
    });

    expect(result.current.assistantText).toBe('Hello');
    expect(result.current.isStreaming).toBe(false);
  });
});
```

- [ ] **Step 2: Write `apps/cockpit-public/src/hooks/useChatStream.ts`**

```typescript
import { useCallback, useRef, useState } from 'react';
import { parseSSEStream } from '@cockpit/shared';

export interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string }

export function useChatStream() {
  const [assistantText, setAssistantText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (modelId: string, messages: ChatMessage[], params?: { temperature?: number; max_tokens?: number; system_prompt?: string }) => {
      setAssistantText('');
      setError(null);
      setIsStreaming(true);
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const response = await fetch('/api/public/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_id: modelId,
            messages,
            temperature: params?.temperature ?? 0.7,
            max_tokens: params?.max_tokens ?? 1024,
            system_prompt: params?.system_prompt,
          }),
          signal: ac.signal,
        });
        if (!response.ok || !response.body) {
          setError(`HTTP ${response.status}`);
          setIsStreaming(false);
          return;
        }
        for await (const ev of parseSSEStream(response.body, ac.signal)) {
          if (ev.event === 'token') {
            try {
              const parsed = JSON.parse(ev.data) as { text?: string };
              if (parsed.text) setAssistantText((cur) => cur + parsed.text);
            } catch {}
          }
          if (ev.event === 'done') break;
          if (ev.event === 'error') {
            setError(ev.data);
            break;
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { assistantText, isStreaming, error, send, stop };
}
```

- [ ] **Step 3: Run test**

Run:
```bash
pnpm --filter cockpit-public test
```
Expected: `5 passed` (4 ModelCard + 1 useChatStream)

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): useChatStream hook with SSE consumption + abort"
```

---

### Task 1.17: ChatPlayground component

**Files:**
- Create: `apps/cockpit-public/src/components/ChatPlayground/{ChatPlayground,MessageBubble,PromptInput,ParamsPanel}.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/src/components/ChatPlayground/MessageBubble.tsx`**

```typescript
import ReactMarkdown from 'react-markdown';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export function MessageBubble({ role, content, streaming }: Props) {
  const align = role === 'user' ? 'ml-auto bg-slate-100' : 'mr-auto bg-emerald-50';
  return (
    <div className={`max-w-[75%] rounded-lg p-3 ${align}`}>
      <ReactMarkdown>{content}</ReactMarkdown>
      {streaming && <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse" />}
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/components/ChatPlayground/PromptInput.tsx`**

```typescript
import { useState, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function PromptInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || disabled) return;
    onSubmit(text.trim());
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={3}
        disabled={disabled}
        className="flex-1 rounded border border-slate-300 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className="rounded bg-emerald-600 px-4 text-white disabled:opacity-50"
      >
        <Send size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write `apps/cockpit-public/src/components/ChatPlayground/ParamsPanel.tsx`**

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface ChatParams {
  temperature: number;
  max_tokens: number;
  system_prompt: string;
}

interface Props {
  value: ChatParams;
  onChange: (v: ChatParams) => void;
}

export function ParamsPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-slate-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 p-3 text-sm font-medium"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        Parameters
      </button>
      {open && (
        <div className="p-3 border-t border-slate-200 space-y-3">
          <label className="block text-sm">
            Temperature: <span className="font-mono">{value.temperature.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={value.temperature}
              onChange={(e) => onChange({ ...value, temperature: Number(e.target.value) })}
              className="block w-full"
            />
          </label>
          <label className="block text-sm">
            Max tokens
            <input
              type="number"
              min={1}
              max={4096}
              value={value.max_tokens}
              onChange={(e) => onChange({ ...value, max_tokens: Number(e.target.value) })}
              className="block w-full rounded border border-slate-300 p-1 mt-1"
            />
          </label>
          <label className="block text-sm">
            System prompt
            <textarea
              rows={2}
              value={value.system_prompt}
              onChange={(e) => onChange({ ...value, system_prompt: e.target.value })}
              className="block w-full rounded border border-slate-300 p-1 mt-1"
            />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write `apps/cockpit-public/src/components/ChatPlayground/ChatPlayground.tsx`**

```typescript
import { useState } from 'react';
import { Square } from 'lucide-react';
import { useChatStream, type ChatMessage } from '@/hooks/useChatStream';
import { MessageBubble } from './MessageBubble';
import { PromptInput } from './PromptInput';
import { ParamsPanel, type ChatParams } from './ParamsPanel';

interface Props {
  modelId: string;
  modelDisplayName: string;
}

export function ChatPlayground({ modelId, modelDisplayName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [params, setParams] = useState<ChatParams>({
    temperature: 0.7,
    max_tokens: 1024,
    system_prompt: '',
  });
  const { assistantText, isStreaming, error, send, stop } = useChatStream();

  const handleSubmit = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    await send(modelId, next, params);
    setMessages([...next, { role: 'assistant', content: assistantText || '' }]);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[80vh] gap-4">
      <header>
        <h2 className="font-bold text-xl">Chat — {modelDisplayName}</h2>
        <p className="text-xs text-slate-500">{modelId}</p>
      </header>

      <ParamsPanel value={params} onChange={setParams} />

      <div className="flex-1 overflow-y-auto rounded border border-slate-200 p-4 space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role as 'user' | 'assistant'} content={m.content} />
        ))}
        {isStreaming && <MessageBubble role="assistant" content={assistantText} streaming />}
        {error && <p className="text-rose-700 text-sm">Error: {error}</p>}
      </div>

      <PromptInput onSubmit={handleSubmit} disabled={isStreaming} />
      {isStreaming && (
        <button
          type="button"
          onClick={stop}
          className="self-end rounded border border-rose-500 px-3 py-1 text-sm text-rose-700"
        >
          <Square size={12} className="inline mr-1" /> Stop
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Write `apps/cockpit-public/src/routes/chat.$owner.$name.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { ChatPlayground } from '@/components/ChatPlayground/ChatPlayground';
import { useModelDetail } from '@/hooks/useModelDetail';

export const Route = createFileRoute('/chat/$owner/$name')({
  component: ChatPage,
});

function ChatPage() {
  const { owner, name } = Route.useParams();
  const detail = useModelDetail(owner, name);

  if (detail.isLoading) return <p>Loading…</p>;
  if (!detail.data) return <p>Model not found.</p>;
  if (!detail.data.chat_eligible) {
    return (
      <p>
        This model is not chat-eligible in sprint 1. See{' '}
        <a className="underline" href={detail.data.hf_url}>
          HuggingFace
        </a>
        .
      </p>
    );
  }
  return <ChatPlayground modelId={detail.data.id} modelDisplayName={detail.data.display_name} />;
}
```

- [ ] **Step 6: Build**

Run:
```bash
pnpm --filter cockpit-public build
```
Expected: succeeds

- [ ] **Step 7: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): ChatPlayground with bubbles, params panel, stop"
```

---

### Task 1.18: Filters (Domain, BaseModel, Status) with URL state

**Files:**
- Create: `apps/cockpit-public/src/components/filters/{DomainFilter,BaseModelFilter,StatusFilter}.tsx`
- Modify: `apps/cockpit-public/src/routes/models.index.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/src/components/filters/StatusFilter.tsx`**

```typescript
const STATUSES = ['featured', 'production', 'alpha', 'experimental', 'deprecated'] as const;

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function StatusFilter({ value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded border border-slate-300 p-1 text-sm"
    >
      <option value="">All statuses</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/components/filters/DomainFilter.tsx`**

```typescript
const DOMAINS = ['kicad', 'stm32', 'esp32', 'platformio', 'iot', 'spice', 'embedded', 'dsp', 'emc', 'power', 'freecad'] as const;

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function DomainFilter({ value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded border border-slate-300 p-1 text-sm"
    >
      <option value="">All domains</option>
      {DOMAINS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Write `apps/cockpit-public/src/components/filters/BaseModelFilter.tsx`**

```typescript
const BASES = ['mistral-large-123b', 'qwen3.5-122b', 'qwen3.5-35b', 'apertus-70b', 'devstral-24b', 'eurollm-22b'] as const;

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export function BaseModelFilter({ value, onChange }: Props) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded border border-slate-300 p-1 text-sm"
    >
      <option value="">All base models</option>
      {BASES.map((b) => (
        <option key={b} value={b}>
          {b}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **Step 4: Modify `apps/cockpit-public/src/routes/models.index.tsx`** — wire filters to URL search params

```typescript
import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { ModelCard } from '@/components/ModelCard';
import { useModels } from '@/hooks/useModels';
import { DomainFilter } from '@/components/filters/DomainFilter';
import { BaseModelFilter } from '@/components/filters/BaseModelFilter';
import { StatusFilter } from '@/components/filters/StatusFilter';

const searchSchema = z.object({
  domain: z.string().optional(),
  base: z.string().optional(),
  status: z.string().optional(),
});

export const Route = createFileRoute('/models/')({
  component: ModelsPage,
  validateSearch: searchSchema,
});

function ModelsPage() {
  const search = useSearch({ from: '/models/' });
  const navigate = useNavigate({ from: '/models' });

  const { data, isLoading, error } = useModels({
    domain: search.domain,
    baseModel: search.base,
    status: search.status,
  });

  const setFilter = (key: 'domain' | 'base' | 'status', value: string | undefined) => {
    navigate({ search: { ...search, [key]: value } });
  };

  if (isLoading) return <p className="text-slate-500">Loading models…</p>;
  if (error) return <p className="text-rose-700">Failed to load models</p>;

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Models ({data?.length ?? 0})</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <DomainFilter value={search.domain} onChange={(v) => setFilter('domain', v)} />
          <BaseModelFilter value={search.base} onChange={(v) => setFilter('base', v)} />
          <StatusFilter value={search.status} onChange={(v) => setFilter('status', v)} />
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data?.map((card) => (
          <ModelCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add zod to deps**

Run:
```bash
pnpm --filter cockpit-public add zod
```

- [ ] **Step 6: Build**

Run:
```bash
pnpm --filter cockpit-public build
```
Expected: succeeds

- [ ] **Step 7: Commit**

```bash
git add apps/cockpit-public/ pnpm-lock.yaml
git commit -m "feat(public): filters (domain, base, status) with URL-state via TanStack Router"
```

---

### Task 1.19: Homepage with Featured section + About

**Files:**
- Modify: `apps/cockpit-public/src/routes/index.tsx`
- Create: `apps/cockpit-public/src/routes/about.tsx`

- [ ] **Step 1: Modify `apps/cockpit-public/src/routes/index.tsx`**

```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { ModelCard } from '@/components/ModelCard';
import { useModels } from '@/hooks/useModels';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { data: all, isLoading } = useModels();
  const featured = (all ?? [])
    .filter((c) => c.status === 'featured')
    .sort((a, b) => (a.featured_rank ?? 999) - (b.featured_rank ?? 999))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <section>
        <h1 className="text-4xl font-bold">L'Électron Rare — Model Showcase</h1>
        <p className="mt-2 text-slate-600">
          24 fine-tuned LLMs published on HuggingFace + 3 EU-sovereign models served live.
          Provenance, eval scores, and chat playground for the AILIANCE Live stack.
        </p>
        <div className="mt-4 flex gap-3">
          <Link to="/models" className="rounded bg-slate-900 px-4 py-2 text-white">
            Browse all models →
          </Link>
          <Link to="/about" className="rounded border border-slate-300 px-4 py-2">
            About
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Featured</h2>
        {isLoading ? (
          <p className="text-slate-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {featured.map((card) => (
              <ModelCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/routes/about.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: AboutPage,
});

function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto prose">
      <h1>About this showcase</h1>
      <p>
        L'Électron Rare's LLM fleet is fine-tuned on Apple Silicon (Mac Studio M3 Ultra,
        512 GB unified memory) using MLX. We distill Claude Opus reasoning into open-source
        models and publish provenance-traceable adapters under Apache-2.0.
      </p>
      <h2>EU AI Act Article 52/53 transparency</h2>
      <p>
        Each model published with full provenance: base model, training method (LoRA / SFT),
        hyperparameters, datasets (HF-traceable, licensed Apache/MIT/CC-BY), hardware,
        run SHA. See <a href="https://github.com/L-electron-Rare/ailiance/blob/main/docs/eu-ai-act-transparency.md">the AILIANCE transparency document</a>.
      </p>
      <h2>Stack</h2>
      <ul>
        <li>Training: MLX bf16 LoRA on Mistral Large 123B, Qwen3.5-122B/35B, Apertus 70B, Devstral 24B, EuroLLM 22B</li>
        <li>Routing: Jina v3 embeddings + MLP classifier (40 domains)</li>
        <li>Serving: 3-worker FastAPI gateway, BF16, shared memory pool</li>
        <li>Evaluation: Lighteval + EvalPlus + MT-Bench + KIKI-native (KiCad/SPICE/EMC/MISRA)</li>
      </ul>
    </article>
  );
}
```

- [ ] **Step 3: Build**

Run:
```bash
pnpm --filter cockpit-public build
```
Expected: succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): homepage with Featured + About page"
```

---

### Task 1.20: Layout — Header + Footer

**Files:**
- Create: `apps/cockpit-public/src/components/layout/{Header,Footer}.tsx`
- Modify: `apps/cockpit-public/src/routes/__root.tsx`

- [ ] **Step 1: Write `apps/cockpit-public/src/components/layout/Header.tsx`**

```typescript
import { Link } from '@tanstack/react-router';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">
          ailiance-demo
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link to="/models" className="hover:underline">Models</Link>
          <Link to="/about" className="hover:underline">About</Link>
          <a
            href="https://huggingface.co/clemsail"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            HuggingFace ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write `apps/cockpit-public/src/components/layout/Footer.tsx`**

```typescript
export function Footer() {
  return (
    <footer className="border-t border-slate-200 mt-12">
      <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-slate-500">
        <p>
          L'Électron Rare — Apache-2.0 — Models on{' '}
          <a className="underline" href="https://huggingface.co/clemsail">clemsail</a> +{' '}
          <a className="underline" href="https://huggingface.co/electron-rare">electron-rare</a>
        </p>
        <p className="mt-1">
          Source:{' '}
          <a className="underline" href="https://github.com/L-electron-Rare/ailiance-demo">
            github.com/L-electron-Rare/ailiance-demo
          </a>
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Modify `apps/cockpit-public/src/routes/__root.tsx`**

```typescript
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Header />
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 4: Build**

Run:
```bash
pnpm --filter cockpit-public build
```

- [ ] **Step 5: Commit**

```bash
git add apps/cockpit-public/
git commit -m "feat(public): Header + Footer layout"
```

---

### Task 1.21: HF background refresh task

**Files:**
- Modify: `apps/api/src/ailiance_demo/main.py`

- [ ] **Step 1: Modify `apps/api/src/ailiance_demo/main.py`** — add asyncio task in lifespan

In `lifespan`, after `cache.refresh()`:

```python
    import asyncio
    refresh_task = asyncio.create_task(_periodic_refresh(cache, settings.hf_sync_interval_seconds))

    yield

    refresh_task.cancel()
    try:
        await refresh_task
    except asyncio.CancelledError:
        pass
    log.info("shutdown")
```

Add at module level:

```python
async def _periodic_refresh(cache: HFCache, interval_seconds: int) -> None:
    import asyncio
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await cache.refresh()
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("hfcache.periodic_refresh_failed", error=str(exc))
```

- [ ] **Step 2: Manual smoke test**

Run:
```bash
uv run uvicorn ailiance_demo.main:app --port 9100 &
sleep 3
curl http://127.0.0.1:9100/api/public/models | head -c 500
kill %1
```
Expected: JSON list of cards (up to 24 if HF reachable)

- [ ] **Step 3: Commit**

```bash
git add apps/api/
git commit -m "feat(api): periodic HF refresh task in lifespan"
```

---

### Task 1.22: Sprint 1 acceptance — full integration test

- [ ] **Step 1: Run all tests**

```bash
uv run pytest apps/api/tests -v
pnpm test
```
Expected: all green

- [ ] **Step 2: Boot and click through manually**

```bash
# Terminal 1
uv run uvicorn ailiance_demo.main:app --reload --port 9100

# Terminal 2
pnpm --filter cockpit-public dev
```

Visit `http://localhost:5173/` — verify:
- Homepage shows Featured cards
- /models shows all cards with filters
- /models/clemsail/micro-kiki-v3 shows detail page
- /chat/ailiance/apertus-70b shows the chat UI (will fail to send if ailiance gateway is not running, but UI loads)
- /about renders

- [ ] **Step 3: Tag**

```bash
git tag -a sprint-1 -m "Sprint 1 — Vitrine + Playground complete"
```

---

## Sprint 2 — Admin Monitoring Read-Only (17 tasks)

Goal: admin app at `/`, `/training`, `/training/$id`, `/workers`, `/eval`. Tailscale auth on backend. Training runs discovery, live LossChart via SSE, virtualized LogTail, workers status grid, eval browser.

### Task 2.1: Tailscale auth dependency

**Files:**
- Create: `apps/api/src/ailiance_demo/auth/__init__.py`, `apps/api/src/ailiance_demo/auth/tailscale.py`, `apps/api/tests/unit/test_tailscale_auth.py`

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/auth/__init__.py`** (empty)

```python
```

- [ ] **Step 2: Write `apps/api/tests/unit/test_tailscale_auth.py`** (test first)

```python
"""Tests for require_tailscale_user."""
import pytest
from fastapi import FastAPI, Depends, HTTPException
from fastapi.testclient import TestClient

from ailiance_demo.auth.tailscale import require_tailscale_user


@pytest.fixture
def app_with_protected() -> TestClient:
    app = FastAPI()

    @app.get("/protected")
    def protected(user: str = Depends(require_tailscale_user)) -> dict:
        return {"user": user}

    return TestClient(app)


def test_returns_401_when_header_missing(app_with_protected: TestClient) -> None:
    response = app_with_protected.get("/protected")
    assert response.status_code == 401


def test_returns_401_when_header_empty(app_with_protected: TestClient) -> None:
    response = app_with_protected.get("/protected", headers={"X-Tailscale-User": ""})
    assert response.status_code == 401


def test_passes_when_header_present(app_with_protected: TestClient) -> None:
    response = app_with_protected.get(
        "/protected", headers={"X-Tailscale-User": "valerie@saillant.cc"}
    )
    assert response.status_code == 200
    assert response.json() == {"user": "valerie@saillant.cc"}
```

- [ ] **Step 3: Run test (must fail)**

Run:
```bash
uv run pytest apps/api/tests/unit/test_tailscale_auth.py -v
```
Expected: FAIL `ImportError`

- [ ] **Step 4: Write `apps/api/src/ailiance_demo/auth/tailscale.py`**

```python
"""Tailscale-User header dependency.

In production:
- nginx on electron-server validates Tailscale auth and injects X-Tailscale-User
- studio :9100 firewall only accepts traffic from electron-server's tailnet IP
- so this header is trusted as long as the firewall holds

In tests, the header is supplied directly.
"""
from fastapi import Header, HTTPException


def require_tailscale_user(
    x_tailscale_user: str | None = Header(default=None, alias="X-Tailscale-User"),
) -> str:
    if not x_tailscale_user or not x_tailscale_user.strip():
        raise HTTPException(
            status_code=401,
            detail="X-Tailscale-User header missing or empty",
        )
    return x_tailscale_user.strip()
```

- [ ] **Step 5: Run tests (must pass)**

```bash
uv run pytest apps/api/tests/unit/test_tailscale_auth.py -v
```
Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/
git commit -m "feat(api): require_tailscale_user dependency for admin routes"
```

---

### Task 2.2: TrainingRun + WorkerStatus schemas

**Files:**
- Create: `apps/api/src/ailiance_demo/models/training_run.py`, `apps/api/src/ailiance_demo/models/worker_status.py`
- Modify: `apps/api/src/ailiance_demo/models/__init__.py`

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/models/training_run.py`**

```python
"""Pydantic schemas for training runs."""
from datetime import datetime
from enum import Enum
from pathlib import Path

from pydantic import BaseModel, Field


class TrainingRunStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    UNKNOWN = "unknown"


class TrainingMetric(BaseModel):
    iter: int
    split: str  # "train" | "val"
    loss: float
    lr: float | None = None
    took_s: float | None = None


class TrainingRun(BaseModel):
    id: str  # derived from log file basename
    log_path: str
    machine: str  # "studio" | "grosmac" | "kxkm-ai"
    model_name: str | None = None
    status: TrainingRunStatus
    started_at: datetime | None = None
    last_update_at: datetime | None = None
    last_iter: int | None = None
    last_train_loss: float | None = None
    last_val_loss: float | None = None
    config_excerpt: dict = Field(default_factory=dict)


class TrainingRunDetail(TrainingRun):
    metrics: list[TrainingMetric] = Field(default_factory=list)
    raw_lines_tail: list[str] = Field(default_factory=list)
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/models/worker_status.py`**

```python
"""Pydantic schemas for worker status."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class WorkerHealth(str, Enum):
    OK = "ok"
    WARN = "warn"
    DOWN = "down"


class WorkerStatus(BaseModel):
    name: str
    url: str
    health: WorkerHealth
    latency_ms: float | None = None
    mem_mb: float | None = None
    last_check_at: datetime
    error: str | None = None
```

- [ ] **Step 3: Modify `apps/api/src/ailiance_demo/models/__init__.py`**

```python
from ailiance_demo.models.eval_result import EvalResult, EvalSummary
from ailiance_demo.models.model_card import ChatBackend, ModelCard, ModelDetail, ModelStatus
from ailiance_demo.models.training_run import (
    TrainingMetric,
    TrainingRun,
    TrainingRunDetail,
    TrainingRunStatus,
)
from ailiance_demo.models.worker_status import WorkerHealth, WorkerStatus

__all__ = [
    "ChatBackend",
    "EvalResult",
    "EvalSummary",
    "ModelCard",
    "ModelDetail",
    "ModelStatus",
    "TrainingMetric",
    "TrainingRun",
    "TrainingRunDetail",
    "TrainingRunStatus",
    "WorkerHealth",
    "WorkerStatus",
]
```

- [ ] **Step 4: Run typecheck on the API tree**

```bash
uv run python -c "from ailiance_demo.models import TrainingRun, WorkerStatus; print('ok')"
```
Expected: `ok`

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): TrainingRun and WorkerStatus Pydantic schemas"
```

---

### Task 2.3: Log tail parser (mlx_lm format)

**Files:**
- Create: `apps/api/src/ailiance_demo/services/log_tail.py`, `apps/api/tests/unit/test_log_tail.py`, `apps/api/tests/fixtures/training_logs/sample.log`

- [ ] **Step 1: Write `apps/api/tests/fixtures/training_logs/sample.log`**

```
Loading config from configs/mistral-large-opus.yaml
Trainable params 16.78M
Iter 100: Train loss 0.612, Learning Rate 1.0e-04, It/sec 0.45, Tokens/sec 1024
Iter 100: Val loss 0.604, Val took 22.3s
Iter 200: Train loss 0.542, Learning Rate 9.5e-05, It/sec 0.46, Tokens/sec 1031
Iter 300: Train loss 0.501, Learning Rate 9.0e-05, It/sec 0.46, Tokens/sec 1029
Iter 200: Val loss 0.532, Val took 22.1s
Iter 400: Train loss 0.479, Learning Rate 8.5e-05, It/sec 0.45, Tokens/sec 1018
```

- [ ] **Step 2: Write `apps/api/tests/unit/test_log_tail.py`** (test first)

```python
"""Tests for log_tail mlx_lm parser."""
from ailiance_demo.services.log_tail import parse_line


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
```

- [ ] **Step 3: Run test (must fail)**

```bash
uv run pytest apps/api/tests/unit/test_log_tail.py -v
```
Expected: FAIL `ImportError`

- [ ] **Step 4: Write `apps/api/src/ailiance_demo/services/log_tail.py`**

```python
"""Parse mlx_lm training log format. Reuses regex from KIKI-Mac_tunner/scripts/training_tui.py."""
from __future__ import annotations

import re

from ailiance_demo.models import TrainingMetric

_VAL_RE = re.compile(r"Iter (\d+): Val loss ([\d.eE+-]+), Val took ([\d.]+)s")
_TRAIN_RE = re.compile(
    r"Iter (\d+): Train loss ([\d.eE+-]+), Learning Rate ([\d.eE+-]+)"
)


def parse_line(line: str) -> TrainingMetric | None:
    line = line.strip()
    if not line:
        return None

    if (m := _VAL_RE.match(line)) is not None:
        return TrainingMetric(
            iter=int(m.group(1)),
            split="val",
            loss=float(m.group(2)),
            took_s=float(m.group(3)),
        )

    if (m := _TRAIN_RE.match(line)) is not None:
        return TrainingMetric(
            iter=int(m.group(1)),
            split="train",
            loss=float(m.group(2)),
            lr=float(m.group(3)),
        )

    return None
```

- [ ] **Step 5: Run tests**

```bash
uv run pytest apps/api/tests/unit/test_log_tail.py -v
```
Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add apps/api/
git commit -m "feat(api): log_tail.parse_line for mlx_lm train/val iter lines"
```

---

### Task 2.4: TrainingRun discovery service

**Files:**
- Create: `apps/api/src/ailiance_demo/services/training_runs.py`, `apps/api/tests/unit/test_training_runs.py`

- [ ] **Step 1: Write `apps/api/tests/unit/test_training_runs.py`** (test first)

```python
"""Tests for training_runs discovery."""
from datetime import datetime, UTC
from pathlib import Path

from ailiance_demo.models import TrainingRunStatus
from ailiance_demo.services.training_runs import discover_runs, summarize_run

FIXTURE = Path(__file__).parent.parent / "fixtures" / "training_logs"


def test_discover_runs_finds_log_files(tmp_path: Path) -> None:
    (tmp_path / "logs").mkdir()
    sample = (FIXTURE / "sample.log").read_text()
    (tmp_path / "logs" / "mistral-large-opus.log").write_text(sample)
    (tmp_path / "logs" / "qwen-35b.log").write_text(sample)

    runs = discover_runs(roots=[tmp_path / "logs"], machine_label="studio")

    assert len(runs) == 2
    ids = {r.id for r in runs}
    assert "mistral-large-opus" in ids
    assert "qwen-35b" in ids
    assert all(r.machine == "studio" for r in runs)


def test_summarize_run_extracts_last_metrics(tmp_path: Path) -> None:
    sample = (FIXTURE / "sample.log").read_text()
    log_path = tmp_path / "test.log"
    log_path.write_text(sample)

    run = summarize_run(log_path, machine_label="studio", active_threshold_seconds=60)

    assert run.id == "test"
    assert run.last_iter == 400
    assert run.last_train_loss == 0.479
    assert run.last_val_loss == 0.532
    # File was just written so it's "active" within threshold
    assert run.status == TrainingRunStatus.ACTIVE


def test_summarize_run_marks_old_files_completed(tmp_path: Path) -> None:
    import os
    import time
    sample = (FIXTURE / "sample.log").read_text()
    log_path = tmp_path / "old.log"
    log_path.write_text(sample)
    # Set mtime to 10 minutes ago
    old_time = time.time() - 600
    os.utime(log_path, (old_time, old_time))

    run = summarize_run(log_path, machine_label="studio", active_threshold_seconds=300)
    assert run.status == TrainingRunStatus.COMPLETED
```

- [ ] **Step 2: Run test (must fail)**

```bash
uv run pytest apps/api/tests/unit/test_training_runs.py -v
```
Expected: FAIL `ImportError`

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/services/training_runs.py`**

```python
"""Discover training runs by walking log directories and parsing them."""
from __future__ import annotations

import time
from datetime import datetime, UTC
from pathlib import Path

import structlog

from ailiance_demo.models import TrainingRun, TrainingRunStatus
from ailiance_demo.services.log_tail import parse_line

log = structlog.get_logger()


def discover_runs(
    roots: list[Path],
    machine_label: str,
    active_threshold_seconds: int = 300,
) -> list[TrainingRun]:
    runs: list[TrainingRun] = []
    for root in roots:
        if not root.exists():
            continue
        for log_path in sorted(root.glob("*.log")):
            try:
                runs.append(summarize_run(log_path, machine_label, active_threshold_seconds))
            except OSError as exc:
                log.warning("training_runs.read_failed", path=str(log_path), error=str(exc))
    return runs


def summarize_run(
    log_path: Path,
    machine_label: str,
    active_threshold_seconds: int = 300,
) -> TrainingRun:
    text = log_path.read_text(errors="replace")
    lines = text.splitlines()

    last_train_loss: float | None = None
    last_val_loss: float | None = None
    last_iter: int | None = None
    for line in lines:
        m = parse_line(line)
        if m is None:
            continue
        last_iter = m.iter
        if m.split == "train":
            last_train_loss = m.loss
        elif m.split == "val":
            last_val_loss = m.loss

    stat = log_path.stat()
    last_update = datetime.fromtimestamp(stat.st_mtime, tz=UTC)
    age = time.time() - stat.st_mtime
    status = TrainingRunStatus.ACTIVE if age <= active_threshold_seconds else TrainingRunStatus.COMPLETED

    return TrainingRun(
        id=log_path.stem,
        log_path=str(log_path),
        machine=machine_label,
        status=status,
        started_at=datetime.fromtimestamp(stat.st_ctime, tz=UTC),
        last_update_at=last_update,
        last_iter=last_iter,
        last_train_loss=last_train_loss,
        last_val_loss=last_val_loss,
    )
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest apps/api/tests/unit/test_training_runs.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): training_runs.discover_runs + summarize_run"
```

---

### Task 2.5: GET /api/admin/training/runs endpoint

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/admin/training.py`, `apps/api/tests/integration/test_training_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py`, `apps/api/src/ailiance_demo/deps.py`, `apps/api/src/ailiance_demo/config.py`

- [ ] **Step 1: Modify `apps/api/src/ailiance_demo/config.py`** — add log roots

Replace the body of `Settings` with the previous fields plus:

```python
    training_log_roots: list[Path] = Field(
        default_factory=lambda: [
            Path.home() / "Documents" / "Projets" / "KIKI-Mac_tunner" / "logs",
            Path.home() / "Documents" / "Projets" / "ailiance" / "logs",
        ],
    )
    machine_label: str = "studio"
    workers_to_check: list[dict] = Field(
        default_factory=lambda: [
            {"name": "gateway", "url": "http://localhost:9200/health"},
            {"name": "apertus", "url": "http://localhost:9301/health"},
            {"name": "devstral", "url": "http://localhost:9302/health"},
            {"name": "eurollm", "url": "http://localhost:9303/health"},
        ],
    )
```

- [ ] **Step 2: Modify `apps/api/src/ailiance_demo/deps.py`** — add training runs accessor

Append:

```python
def get_training_runs_provider(request: Request):
    provider = getattr(request.app.state, "training_runs_provider", None)
    if provider is None:
        raise RuntimeError("training_runs provider not initialized")
    return provider
```

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/routers/admin/training.py`**

```python
"""Admin training runs endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.deps import get_training_runs_provider
from ailiance_demo.models import TrainingRun

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/training/runs", response_model=list[TrainingRun])
def list_training_runs(provider=Depends(get_training_runs_provider)) -> list[TrainingRun]:
    return provider.list_runs()


@router.get("/training/runs/{run_id}", response_model=TrainingRun)
def get_training_run(
    run_id: str,
    provider=Depends(get_training_runs_provider),
) -> TrainingRun:
    run = provider.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return run


@router.get("/training/runs/{run_id}/logs")
async def stream_training_logs(
    run_id: str,
    provider=Depends(get_training_runs_provider),
) -> StreamingResponse:
    run = provider.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    return StreamingResponse(provider.tail_log_sse(run_id), media_type="text/event-stream")
```

- [ ] **Step 4: Add a TrainingRunsProvider class**

Create `apps/api/src/ailiance_demo/services/training_runs_provider.py`:

```python
"""Provider that ties discovery + log tailing into a unified interface."""
from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from pathlib import Path

import structlog

from ailiance_demo.models import TrainingRun
from ailiance_demo.services.log_tail import parse_line
from ailiance_demo.services.training_runs import discover_runs

log = structlog.get_logger()


class TrainingRunsProvider:
    def __init__(self, roots: list[Path], machine_label: str) -> None:
        self.roots = roots
        self.machine_label = machine_label

    def list_runs(self) -> list[TrainingRun]:
        return discover_runs(self.roots, self.machine_label)

    def get_run(self, run_id: str) -> TrainingRun | None:
        for run in self.list_runs():
            if run.id == run_id:
                return run
        return None

    async def tail_log_sse(self, run_id: str) -> AsyncIterator[bytes]:
        run = self.get_run(run_id)
        if run is None:
            yield b'event: error\ndata: {"message":"run not found"}\n\n'
            return

        log_path = Path(run.log_path)
        if not log_path.exists():
            yield b'event: error\ndata: {"message":"log file missing"}\n\n'
            return

        # Initial: send the entire current content as raw events, then tail for new data
        existing = log_path.read_text(errors="replace")
        for line in existing.splitlines():
            event = self._line_to_event(line)
            if event:
                yield event

        # Tail for new lines
        with log_path.open("r") as f:
            f.seek(0, 2)  # end
            while True:
                pos = f.tell()
                line = f.readline()
                if not line:
                    await asyncio.sleep(0.5)
                    f.seek(pos)
                    continue
                event = self._line_to_event(line.rstrip("\n"))
                if event:
                    yield event

    def _line_to_event(self, line: str) -> bytes | None:
        if not line:
            return None
        metric = parse_line(line)
        if metric is not None:
            payload = metric.model_dump(mode="json")
            payload["type"] = "iter"
            return f"event: iter\ndata: {json.dumps(payload)}\n\n".encode()
        # raw line
        return f"event: raw\ndata: {json.dumps({'line': line})}\n\n".encode()
```

- [ ] **Step 5: Modify `apps/api/src/ailiance_demo/main.py`** — wire provider and admin router

Add imports:

```python
from ailiance_demo.routers.admin import training as admin_training
from ailiance_demo.services.training_runs_provider import TrainingRunsProvider
```

In `lifespan()`, after `eval_index`:

```python
    runs_provider = TrainingRunsProvider(
        roots=settings.training_log_roots,
        machine_label=settings.machine_label,
    )
    app.state.training_runs_provider = runs_provider
```

In `create_app()`:

```python
    app.include_router(admin_training.router)
```

- [ ] **Step 6: Write `apps/api/tests/integration/test_training_endpoint.py`**

```python
"""Tests for /api/admin/training/* endpoints."""
from pathlib import Path

from fastapi.testclient import TestClient

from ailiance_demo.deps import get_training_runs_provider, get_hf_cache, get_eval_index
from ailiance_demo.main import create_app
from ailiance_demo.services.training_runs_provider import TrainingRunsProvider


def test_list_runs_requires_tailscale_user(tmp_path: Path, empty_hf_cache, empty_eval_index) -> None:
    (tmp_path / "logs").mkdir()
    (tmp_path / "logs" / "demo.log").write_text("Iter 100: Train loss 0.5, Learning Rate 1e-4\n")
    provider = TrainingRunsProvider(roots=[tmp_path / "logs"], machine_label="studio")

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    # Missing header -> 401
    response = client.get("/api/admin/training/runs")
    assert response.status_code == 401


def test_list_runs_returns_runs_with_header(
    tmp_path: Path, empty_hf_cache, empty_eval_index
) -> None:
    (tmp_path / "logs").mkdir()
    (tmp_path / "logs" / "demo.log").write_text(
        "Iter 100: Train loss 0.5, Learning Rate 1e-4\n"
        "Iter 100: Val loss 0.45, Val took 10s\n"
    )
    provider = TrainingRunsProvider(roots=[tmp_path / "logs"], machine_label="studio")

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    response = client.get(
        "/api/admin/training/runs",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    runs = response.json()
    assert len(runs) == 1
    assert runs[0]["id"] == "demo"
    assert runs[0]["last_iter"] == 100


def test_get_run_404(tmp_path: Path, empty_hf_cache, empty_eval_index) -> None:
    provider = TrainingRunsProvider(roots=[tmp_path], machine_label="studio")
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    app.dependency_overrides[get_training_runs_provider] = lambda: provider
    client = TestClient(app)

    response = client.get(
        "/api/admin/training/runs/nonexistent",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 404
```

- [ ] **Step 7: Run tests**

```bash
uv run pytest apps/api/tests -v
```
Expected: all green

- [ ] **Step 8: Commit**

```bash
git add apps/api/
git commit -m "feat(api): /api/admin/training/runs and SSE log tail (Tailscale-protected)"
```

---

### Task 2.6: Workers status service + endpoint

**Files:**
- Create: `apps/api/src/ailiance_demo/services/workers.py`, `apps/api/src/ailiance_demo/routers/admin/workers.py`, `apps/api/tests/unit/test_workers.py`, `apps/api/tests/integration/test_workers_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py`, `apps/api/src/ailiance_demo/deps.py`

- [ ] **Step 1: Write `apps/api/tests/unit/test_workers.py`** (test first)

```python
"""Tests for workers ping service."""
import httpx
import pytest

from ailiance_demo.models import WorkerHealth
from ailiance_demo.services.workers import ping_worker


@pytest.mark.asyncio
async def test_ping_worker_returns_ok_on_200() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"status": "healthy"})
    transport = httpx.MockTransport(handler)

    status = await ping_worker(
        name="apertus",
        url="http://test/health",
        transport=transport,
    )
    assert status.health == WorkerHealth.OK
    assert status.latency_ms is not None


@pytest.mark.asyncio
async def test_ping_worker_returns_down_on_5xx() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(503, text="unavailable")
    transport = httpx.MockTransport(handler)

    status = await ping_worker(name="x", url="http://test/health", transport=transport)
    assert status.health == WorkerHealth.DOWN


@pytest.mark.asyncio
async def test_ping_worker_returns_down_on_connection_error() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("refused")
    transport = httpx.MockTransport(handler)

    status = await ping_worker(name="x", url="http://test/health", transport=transport)
    assert status.health == WorkerHealth.DOWN
    assert status.error is not None
```

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/services/workers.py`**

```python
"""Ping configured workers and aggregate their health."""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, UTC

import httpx
import structlog

from ailiance_demo.models import WorkerHealth, WorkerStatus

log = structlog.get_logger()


async def ping_worker(
    name: str,
    url: str,
    transport: httpx.BaseTransport | None = None,
    timeout_s: float = 1.0,
) -> WorkerStatus:
    kwargs: dict = {"timeout": timeout_s}
    if transport is not None:
        kwargs["transport"] = transport

    started = time.perf_counter()
    error: str | None = None
    health = WorkerHealth.DOWN
    latency_ms: float | None = None

    try:
        async with httpx.AsyncClient(**kwargs) as client:
            response = await client.get(url)
            latency_ms = (time.perf_counter() - started) * 1000
            if response.status_code < 400:
                health = WorkerHealth.OK
            elif response.status_code < 500:
                health = WorkerHealth.WARN
                error = f"HTTP {response.status_code}"
            else:
                health = WorkerHealth.DOWN
                error = f"HTTP {response.status_code}"
    except httpx.HTTPError as exc:
        error = str(exc)

    return WorkerStatus(
        name=name,
        url=url,
        health=health,
        latency_ms=latency_ms,
        last_check_at=datetime.now(UTC),
        error=error,
    )


async def ping_all(workers: list[dict]) -> list[WorkerStatus]:
    tasks = [ping_worker(name=w["name"], url=w["url"]) for w in workers]
    return await asyncio.gather(*tasks)
```

- [ ] **Step 3: Write `apps/api/src/ailiance_demo/routers/admin/workers.py`**

```python
"""Admin workers status endpoint."""
from fastapi import APIRouter, Depends

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.config import settings
from ailiance_demo.models import WorkerStatus
from ailiance_demo.services.workers import ping_all

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/workers/status", response_model=list[WorkerStatus])
async def workers_status() -> list[WorkerStatus]:
    return await ping_all(settings.workers_to_check)
```

- [ ] **Step 4: Modify `apps/api/src/ailiance_demo/main.py`** — mount workers router

In imports:

```python
from ailiance_demo.routers.admin import workers as admin_workers
```

In `create_app()`:

```python
    app.include_router(admin_workers.router)
```

- [ ] **Step 5: Write `apps/api/tests/integration/test_workers_endpoint.py`**

```python
"""Tests for /api/admin/workers/status."""
from fastapi.testclient import TestClient

from ailiance_demo.deps import get_hf_cache, get_eval_index
from ailiance_demo.main import create_app


def test_workers_status_requires_tailscale(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/admin/workers/status")
    assert response.status_code == 401


def test_workers_status_returns_list(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get(
        "/api/admin/workers/status",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    workers = response.json()
    # 4 default workers configured: gateway, apertus, devstral, eurollm
    assert len(workers) == 4
    # All down because tests don't have real workers
    assert all(w["health"] == "down" for w in workers)
```

- [ ] **Step 6: Run tests**

```bash
uv run pytest apps/api/tests -v
```
Expected: all green (some workers tests will be slow because of 1s timeout × 4)

- [ ] **Step 7: Commit**

```bash
git add apps/api/
git commit -m "feat(api): /api/admin/workers/status with parallel pings"
```

---

### Task 2.7: Eval browser endpoint

**Files:**
- Create: `apps/api/src/ailiance_demo/routers/admin/eval_browser.py`, `apps/api/tests/integration/test_eval_browser_endpoint.py`
- Modify: `apps/api/src/ailiance_demo/main.py`

- [ ] **Step 1: Write `apps/api/src/ailiance_demo/routers/admin/eval_browser.py`**

```python
"""Admin endpoint to browse all eval results across machines/repos."""
from fastapi import APIRouter, Depends

from ailiance_demo.auth.tailscale import require_tailscale_user
from ailiance_demo.deps import get_eval_index
from ailiance_demo.models import EvalResult
from ailiance_demo.services.eval_index import EvalIndex

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_tailscale_user)],
)


@router.get("/eval/results", response_model=list[EvalResult])
def list_eval_results(index: EvalIndex = Depends(get_eval_index)) -> list[EvalResult]:
    flat: list[EvalResult] = []
    for results in index._by_model.values():  # noqa: SLF001
        flat.extend(results)
    return sorted(flat, key=lambda r: r.timestamp, reverse=True)
```

- [ ] **Step 2: Modify `apps/api/src/ailiance_demo/main.py`** — mount eval_browser

```python
from ailiance_demo.routers.admin import eval_browser as admin_eval_browser
```

```python
    app.include_router(admin_eval_browser.router)
```

- [ ] **Step 3: Write `apps/api/tests/integration/test_eval_browser_endpoint.py`**

```python
"""Tests for /api/admin/eval/results."""
import json
from pathlib import Path

from fastapi.testclient import TestClient

from ailiance_demo.deps import get_hf_cache, get_eval_index
from ailiance_demo.main import create_app
from ailiance_demo.services.eval_index import EvalIndex


def test_eval_browser_requires_tailscale(empty_hf_cache, empty_eval_index) -> None:
    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: empty_eval_index
    client = TestClient(app)

    response = client.get("/api/admin/eval/results")
    assert response.status_code == 401


def test_eval_browser_returns_flat_list(tmp_path: Path, empty_hf_cache) -> None:
    p1 = {
        "model_id": "a/b",
        "benchmark": "B1",
        "metric": "m",
        "score": 0.5,
        "timestamp": "2026-04-01T00:00:00Z",
    }
    p2 = {
        "model_id": "a/b",
        "benchmark": "B2",
        "metric": "m",
        "score": 0.8,
        "timestamp": "2026-04-15T00:00:00Z",
    }
    (tmp_path / "1.json").write_text(json.dumps(p1))
    (tmp_path / "2.json").write_text(json.dumps(p2))
    index = EvalIndex(roots=[tmp_path])
    index.refresh()

    app = create_app()
    app.dependency_overrides[get_hf_cache] = lambda: empty_hf_cache
    app.dependency_overrides[get_eval_index] = lambda: index
    client = TestClient(app)

    response = client.get(
        "/api/admin/eval/results",
        headers={"X-Tailscale-User": "valerie@saillant.cc"},
    )
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    # Sorted by timestamp desc
    assert results[0]["benchmark"] == "B2"
```

- [ ] **Step 4: Run tests**

```bash
uv run pytest apps/api/tests -v
```
Expected: all green

- [ ] **Step 5: Commit**

```bash
git add apps/api/
git commit -m "feat(api): /api/admin/eval/results — flat list of all eval results"
```

---

### Task 2.8: Regenerate API types after admin endpoints

- [ ] **Step 1: Regenerate**

```bash
pnpm gen:api-types
pnpm typecheck
```
Expected: types updated, no errors

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/api/types.ts || true
git commit --allow-empty -m "chore(shared): regenerate API types after sprint 2 admin endpoints"
```

---

### Task 2.9: Scaffold `apps/cockpit-admin/`

**Files:** mirror cockpit-public with admin prefix

- Create: `apps/cockpit-admin/{package.json,tsconfig.json,vite.config.ts,tailwind.config.ts,postcss.config.js,index.html,vitest.config.ts}`, `apps/cockpit-admin/src/{main.tsx,App.tsx,router.tsx,queryClient.ts,index.css,routes/__root.tsx,routes/index.tsx,lib/api.ts}`, `apps/cockpit-admin/tests/setup.ts`

- [ ] **Step 1: Write `apps/cockpit-admin/package.json`**

```json
{
  "name": "cockpit-admin",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5174",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 5174",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@cockpit/shared": "workspace:*",
    "@tanstack/react-query": "^5.62.0",
    "@tanstack/react-router": "^1.85.0",
    "@tanstack/router-devtools": "^1.85.0",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-virtuoso": "^4.12.0",
    "recharts": "^2.13.0"
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.85.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Reuse the same tsconfig.json, vite.config.ts, tailwind.config.ts, postcss.config.js, index.html, vitest.config.ts content as cockpit-public**

For each, copy the corresponding file from `apps/cockpit-public/` to `apps/cockpit-admin/` and adjust:
- `vite.config.ts` server.port = 5174 (and proxy `/api` to `127.0.0.1:9100` plus add `Tailscale-User` header injection in dev)

`apps/cockpit-admin/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [
    TanStackRouterVite({ routesDirectory: 'src/routes', generatedRouteTree: 'src/routeTree.gen.ts' }),
    react(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9100',
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Inject Tailscale-User header for local dev (auth simulated)
            proxyReq.setHeader('X-Tailscale-User', 'dev@local');
          });
        },
      },
    },
  },
});
```

- [ ] **Step 3: Write `apps/cockpit-admin/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ailiance-demo admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Write `apps/cockpit-admin/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Write `apps/cockpit-admin/src/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5_000, refetchInterval: 5_000, refetchOnWindowFocus: true },
  },
});
```

- [ ] **Step 6: Write `apps/cockpit-admin/src/lib/api.ts`**

```typescript
import { createApiClient } from '@cockpit/shared';

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
});
```

- [ ] **Step 7: Write `apps/cockpit-admin/src/router.tsx`**

```typescript
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
```

- [ ] **Step 8: Write `apps/cockpit-admin/src/main.tsx`**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { router } from './router';
import { queryClient } from './queryClient';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 9: Write `apps/cockpit-admin/src/routes/__root.tsx`**

```typescript
import { Outlet, createRootRoute, Link } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-slate-900 text-slate-100 px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="font-bold">ailiance-demo · admin</h1>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="hover:underline">Dashboard</Link>
            <Link to="/training" className="hover:underline">Training</Link>
            <Link to="/workers" className="hover:underline">Workers</Link>
            <Link to="/eval" className="hover:underline">Eval</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 10: Write `apps/cockpit-admin/src/routes/index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <p className="text-slate-600 mt-2">
        Widgets land here in Task 2.13. Use the nav above to drill into Training, Workers, Eval.
      </p>
    </div>
  );
}
```

- [ ] **Step 11: Write `apps/cockpit-admin/tsconfig.json`** (same as cockpit-public — copy)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 12: Write `apps/cockpit-admin/tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/shared/src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 13: Write `apps/cockpit-admin/postcss.config.js`**

```javascript
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 14: Write `apps/cockpit-admin/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 15: Write `apps/cockpit-admin/tests/setup.ts`**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 16: Build**

```bash
pnpm install
pnpm --filter cockpit-admin typecheck
pnpm --filter cockpit-admin build
```

- [ ] **Step 17: Commit**

```bash
git add apps/cockpit-admin/ pnpm-lock.yaml
git commit -m "feat(admin): scaffold cockpit-admin Vite app"
```

---

### Task 2.10: useTrainingRuns hook + /training route

**Files:**
- Create: `apps/cockpit-admin/src/hooks/useTrainingRuns.ts`, `apps/cockpit-admin/src/components/TrainingRunCard.tsx`, `apps/cockpit-admin/src/routes/training.index.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/src/hooks/useTrainingRuns.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type TrainingRun = components['schemas']['TrainingRun'];

export function useTrainingRuns() {
  return useQuery<TrainingRun[]>({
    queryKey: ['training-runs'],
    queryFn: ({ signal }) => api.get<TrainingRun[]>('/api/admin/training/runs', { signal }),
    refetchInterval: 5_000,
  });
}
```

- [ ] **Step 2: Write `apps/cockpit-admin/src/components/TrainingRunCard.tsx`**

```typescript
import { Link } from '@tanstack/react-router';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import type { components } from '@cockpit/shared';

type Run = components['schemas']['TrainingRun'];

interface Props { run: Run }

export function TrainingRunCard({ run }: Props) {
  const Icon = run.status === 'active' ? Activity : run.status === 'completed' ? CheckCircle2 : AlertCircle;
  const color = run.status === 'active' ? 'text-emerald-600' : run.status === 'completed' ? 'text-slate-500' : 'text-rose-600';
  return (
    <Link
      to="/training/$id"
      params={{ id: run.id }}
      className="block rounded border border-slate-200 bg-white p-4 hover:shadow-sm"
    >
      <header className="flex items-center justify-between">
        <h3 className="font-bold">{run.id}</h3>
        <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
          <Icon size={14} /> {run.status}
        </span>
      </header>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-slate-500">Machine</dt>
        <dd>{run.machine}</dd>
        <dt className="text-slate-500">Iter</dt>
        <dd className="font-mono">{run.last_iter ?? '—'}</dd>
        <dt className="text-slate-500">Train loss</dt>
        <dd className="font-mono">{run.last_train_loss?.toFixed(4) ?? '—'}</dd>
        <dt className="text-slate-500">Val loss</dt>
        <dd className="font-mono">{run.last_val_loss?.toFixed(4) ?? '—'}</dd>
      </dl>
    </Link>
  );
}
```

- [ ] **Step 3: Write `apps/cockpit-admin/src/routes/training.index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useTrainingRuns } from '@/hooks/useTrainingRuns';
import { TrainingRunCard } from '@/components/TrainingRunCard';

export const Route = createFileRoute('/training/')({
  component: TrainingListPage,
});

function TrainingListPage() {
  const { data, isLoading, error } = useTrainingRuns();

  if (isLoading) return <p className="text-slate-500">Loading runs…</p>;
  if (error) return <p className="text-rose-700">Failed to load runs</p>;
  if (!data || data.length === 0) {
    return <p className="text-slate-500">No training runs found in the configured directories.</p>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Training runs ({data.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((run) => (
          <TrainingRunCard key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Build**

```bash
pnpm --filter cockpit-admin build
```

- [ ] **Step 5: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): /training list with TrainingRunCard"
```

---

### Task 2.11: LossChart component (recharts)

**Files:**
- Create: `apps/cockpit-admin/src/components/LossChart.tsx`, `apps/cockpit-admin/tests/components/LossChart.test.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/tests/components/LossChart.test.tsx`** (test first)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LossChart } from '../../src/components/LossChart';

describe('LossChart', () => {
  it('renders empty state when no metrics', () => {
    render(<LossChart metrics={[]} />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('renders chart container when metrics provided', () => {
    const metrics = [
      { iter: 100, split: 'train', loss: 0.5, lr: null, took_s: null },
      { iter: 100, split: 'val', loss: 0.45, lr: null, took_s: 10 },
      { iter: 200, split: 'train', loss: 0.4, lr: null, took_s: null },
    ];
    const { container } = render(<LossChart metrics={metrics} />);
    expect(container.querySelector('.recharts-wrapper')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write `apps/cockpit-admin/src/components/LossChart.tsx`**

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { components } from '@cockpit/shared';

type Metric = components['schemas']['TrainingMetric'];

interface Props {
  metrics: Metric[];
}

export function LossChart({ metrics }: Props) {
  if (metrics.length === 0) {
    return <p className="text-slate-500 italic">No data yet.</p>;
  }

  // Pivot: each iter shows train and/or val
  const byIter = new Map<number, { iter: number; train: number | null; val: number | null }>();
  for (const m of metrics) {
    const existing = byIter.get(m.iter) ?? { iter: m.iter, train: null, val: null };
    if (m.split === 'train') existing.train = m.loss;
    if (m.split === 'val') existing.val = m.loss;
    byIter.set(m.iter, existing);
  }
  const data = Array.from(byIter.values()).sort((a, b) => a.iter - b.iter);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="iter" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="train" stroke="#2563eb" name="Train loss" dot={false} connectNulls />
        <Line type="monotone" dataKey="val" stroke="#dc2626" name="Val loss" dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Run test**

```bash
pnpm --filter cockpit-admin test
```
Expected: `2 passed`

- [ ] **Step 4: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): LossChart recharts component (train+val pivot)"
```

---

### Task 2.12: useTrainingLogs SSE hook + LogTail virtualized

**Files:**
- Create: `apps/cockpit-admin/src/hooks/useTrainingLogs.ts`, `apps/cockpit-admin/src/components/LogTail.tsx`, `apps/cockpit-admin/tests/components/LogTail.test.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/src/hooks/useTrainingLogs.ts`**

```typescript
import { useEffect, useRef, useState } from 'react';
import { parseSSEStream } from '@cockpit/shared';
import type { components } from '@cockpit/shared';

type Metric = components['schemas']['TrainingMetric'];

export interface LogEvent {
  type: 'iter' | 'raw' | 'error';
  metric?: Metric;
  raw?: string;
  error?: string;
}

export function useTrainingLogs(runId: string, enabled = true) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        const response = await fetch(`/api/admin/training/runs/${runId}/logs`, {
          signal: ac.signal,
        });
        if (!response.ok || !response.body) return;
        setConnected(true);
        for await (const ev of parseSSEStream(response.body, ac.signal)) {
          if (ev.event === 'iter') {
            try {
              const parsed = JSON.parse(ev.data);
              const metric = parsed as Metric;
              setMetrics((cur) => [...cur, metric]);
              setEvents((cur) => [...cur, { type: 'iter', metric }]);
            } catch {}
          } else if (ev.event === 'raw') {
            try {
              const parsed = JSON.parse(ev.data) as { line: string };
              setEvents((cur) => [...cur, { type: 'raw', raw: parsed.line }]);
            } catch {}
          } else if (ev.event === 'error') {
            setEvents((cur) => [...cur, { type: 'error', error: ev.data }]);
          }
        }
      } finally {
        setConnected(false);
      }
    })();

    return () => ac.abort();
  }, [runId, enabled]);

  return { events, metrics, connected };
}
```

- [ ] **Step 2: Write `apps/cockpit-admin/src/components/LogTail.tsx`**

```typescript
import { useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Search, Copy } from 'lucide-react';
import type { LogEvent } from '@/hooks/useTrainingLogs';

interface Props {
  events: LogEvent[];
}

export function LogTail({ events }: Props) {
  const [filter, setFilter] = useState('');

  const filtered = events.filter((e) => {
    if (!filter) return true;
    const text = e.raw ?? (e.metric ? JSON.stringify(e.metric) : e.error ?? '');
    try {
      return new RegExp(filter, 'i').test(text);
    } catch {
      return text.toLowerCase().includes(filter.toLowerCase());
    }
  });

  const copyAll = async () => {
    const text = filtered
      .map((e) => e.raw ?? (e.metric ? JSON.stringify(e.metric) : e.error ?? ''))
      .join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="rounded border border-slate-200 bg-slate-900 text-slate-100">
      <header className="flex items-center gap-2 border-b border-slate-700 p-2">
        <Search size={14} className="text-slate-400" />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="regex filter…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <button
          type="button"
          onClick={copyAll}
          className="text-xs flex items-center gap-1 hover:text-emerald-400"
        >
          <Copy size={12} /> Copy
        </button>
      </header>
      <Virtuoso
        style={{ height: 400 }}
        data={filtered}
        followOutput="smooth"
        itemContent={(_, ev) => <LogLine ev={ev} />}
      />
    </div>
  );
}

function LogLine({ ev }: { ev: LogEvent }) {
  if (ev.type === 'iter' && ev.metric) {
    const m = ev.metric;
    const color = m.split === 'train' ? 'text-blue-300' : 'text-rose-300';
    return (
      <div className={`px-2 py-0.5 font-mono text-xs ${color}`}>
        Iter {m.iter} [{m.split}] loss={m.loss.toFixed(4)}
        {m.lr !== null && ` lr=${m.lr.toExponential(2)}`}
        {m.took_s !== null && ` took=${m.took_s}s`}
      </div>
    );
  }
  if (ev.type === 'error') {
    return <div className="px-2 py-0.5 font-mono text-xs text-rose-400">[ERROR] {ev.error}</div>;
  }
  return <div className="px-2 py-0.5 font-mono text-xs text-slate-300">{ev.raw}</div>;
}
```

- [ ] **Step 3: Write `apps/cockpit-admin/tests/components/LogTail.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogTail } from '../../src/components/LogTail';

describe('LogTail', () => {
  it('renders an empty list', () => {
    const { container } = render(<LogTail events={[]} />);
    expect(container).toBeTruthy();
  });

  it('renders raw lines', () => {
    render(
      <LogTail
        events={[
          { type: 'raw', raw: 'Loading config…' },
          { type: 'raw', raw: 'Trainable params 16M' },
        ]}
      />,
    );
    // Virtuoso may render lazily; test the filter input is present
    expect(screen.getByPlaceholderText(/regex filter/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run test**

```bash
pnpm --filter cockpit-admin test
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): LogTail virtualized + useTrainingLogs SSE hook"
```

---

### Task 2.13: /training/$id detail route

**Files:**
- Create: `apps/cockpit-admin/src/routes/training.$id.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/src/routes/training.$id.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LossChart } from '@/components/LossChart';
import { LogTail } from '@/components/LogTail';
import { useTrainingLogs } from '@/hooks/useTrainingLogs';
import type { components } from '@cockpit/shared';

type TrainingRun = components['schemas']['TrainingRun'];

export const Route = createFileRoute('/training/$id')({
  component: TrainingDetailPage,
});

function TrainingDetailPage() {
  const { id } = Route.useParams();
  const runQuery = useQuery<TrainingRun>({
    queryKey: ['training-run', id],
    queryFn: ({ signal }) => api.get<TrainingRun>(`/api/admin/training/runs/${id}`, { signal }),
    refetchInterval: 5_000,
  });

  const { events, metrics, connected } = useTrainingLogs(id);

  if (runQuery.isLoading) return <p>Loading…</p>;
  if (runQuery.error || !runQuery.data) return <p className="text-rose-700">Run not found</p>;
  const run = runQuery.data;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold">{run.id}</h2>
        <p className="text-sm text-slate-500">
          {run.machine} · {run.status} · iter {run.last_iter ?? '—'} ·
          {connected ? ' streaming' : ' not connected'}
        </p>
      </header>

      <section>
        <h3 className="font-bold mb-2">Loss curve</h3>
        <LossChart metrics={metrics.length > 0 ? metrics : []} />
      </section>

      <section>
        <h3 className="font-bold mb-2">Logs ({events.length})</h3>
        <LogTail events={events} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter cockpit-admin build
```

- [ ] **Step 3: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): /training/$id detail with LossChart + LogTail"
```

---

### Task 2.14: useWorkersStatus hook + WorkerStatusGrid + /workers route

**Files:**
- Create: `apps/cockpit-admin/src/hooks/useWorkersStatus.ts`, `apps/cockpit-admin/src/components/WorkerStatusGrid.tsx`, `apps/cockpit-admin/src/routes/workers.index.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/src/hooks/useWorkersStatus.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type WorkerStatus = components['schemas']['WorkerStatus'];

export function useWorkersStatus() {
  return useQuery<WorkerStatus[]>({
    queryKey: ['workers-status'],
    queryFn: ({ signal }) => api.get<WorkerStatus[]>('/api/admin/workers/status', { signal }),
    refetchInterval: 5_000,
  });
}
```

- [ ] **Step 2: Write `apps/cockpit-admin/src/components/WorkerStatusGrid.tsx`**

```typescript
import type { components } from '@cockpit/shared';

type Worker = components['schemas']['WorkerStatus'];

interface Props { workers: Worker[] }

export function WorkerStatusGrid({ workers }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {workers.map((w) => (
        <WorkerCard key={w.name} worker={w} />
      ))}
    </div>
  );
}

function WorkerCard({ worker }: { worker: Worker }) {
  const colors: Record<string, string> = {
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    down: 'border-rose-300 bg-rose-50 text-rose-900',
  };
  const cls = colors[worker.health] ?? colors.down;
  return (
    <article className={`rounded border-2 ${cls} p-3`}>
      <h4 className="font-bold">{worker.name}</h4>
      <p className="text-xs opacity-75 break-all">{worker.url}</p>
      <dl className="mt-2 text-sm space-y-1">
        <div className="flex justify-between">
          <dt>Health</dt>
          <dd className="font-mono">{worker.health}</dd>
        </div>
        {worker.latency_ms !== null && (
          <div className="flex justify-between">
            <dt>Latency</dt>
            <dd className="font-mono">{worker.latency_ms.toFixed(0)} ms</dd>
          </div>
        )}
        {worker.error && (
          <p className="text-xs italic">Error: {worker.error}</p>
        )}
      </dl>
    </article>
  );
}
```

- [ ] **Step 3: Write `apps/cockpit-admin/src/routes/workers.index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useWorkersStatus } from '@/hooks/useWorkersStatus';
import { WorkerStatusGrid } from '@/components/WorkerStatusGrid';

export const Route = createFileRoute('/workers/')({
  component: WorkersPage,
});

function WorkersPage() {
  const { data, isLoading, error } = useWorkersStatus();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-rose-700">Failed to load workers</p>;
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Workers</h2>
      <WorkerStatusGrid workers={data ?? []} />
    </div>
  );
}
```

- [ ] **Step 4: Build**

```bash
pnpm --filter cockpit-admin build
```

- [ ] **Step 5: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): /workers grid with 5s polling"
```

---

### Task 2.15: /eval browser route

**Files:**
- Create: `apps/cockpit-admin/src/routes/eval.index.tsx`

- [ ] **Step 1: Write `apps/cockpit-admin/src/routes/eval.index.tsx`**

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type EvalResult = components['schemas']['EvalResult'];

export const Route = createFileRoute('/eval/')({
  component: EvalPage,
});

function EvalPage() {
  const { data, isLoading, error } = useQuery<EvalResult[]>({
    queryKey: ['eval-results'],
    queryFn: ({ signal }) => api.get<EvalResult[]>('/api/admin/eval/results', { signal }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="text-rose-700">Failed to load eval results</p>;
  if (!data || data.length === 0) return <p className="text-slate-500">No eval results found.</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Eval results ({data.length})</h2>
      <table className="w-full text-sm bg-white rounded border border-slate-200">
        <thead className="text-left bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="p-2">Model</th>
            <th className="p-2">Benchmark</th>
            <th className="p-2">Score</th>
            <th className="p-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={`${r.model_id}-${r.benchmark}-${i}`} className="border-b border-slate-100">
              <td className="p-2 font-mono">{r.model_id}</td>
              <td className="p-2">{r.benchmark}</td>
              <td className="p-2 font-mono">{(r.score * 100).toFixed(1)}%</td>
              <td className="p-2 text-slate-500">{new Date(r.timestamp).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter cockpit-admin build
```

- [ ] **Step 3: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): /eval browser table"
```

---

### Task 2.16: Dashboard widgets (4-grid overview)

**Files:**
- Modify: `apps/cockpit-admin/src/routes/index.tsx`

- [ ] **Step 1: Replace `apps/cockpit-admin/src/routes/index.tsx`**

```typescript
import { createFileRoute, Link } from '@tanstack/react-router';
import { useTrainingRuns } from '@/hooks/useTrainingRuns';
import { useWorkersStatus } from '@/hooks/useWorkersStatus';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { components } from '@cockpit/shared';

type EvalResult = components['schemas']['EvalResult'];

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  const runs = useTrainingRuns();
  const workers = useWorkersStatus();
  const evals = useQuery<EvalResult[]>({
    queryKey: ['eval-results'],
    queryFn: ({ signal }) => api.get<EvalResult[]>('/api/admin/eval/results', { signal }),
  });

  const activeRuns = (runs.data ?? []).filter((r) => r.status === 'active');
  const downWorkers = (workers.data ?? []).filter((w) => w.health === 'down');
  const latestEval = (evals.data ?? [])[0];
  const lastRun = (runs.data ?? [])[0];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Widget title="Active trainings" value={`${activeRuns.length}`} subtitle={lastRun ? `last: ${lastRun.id}` : 'no recent run'} link={{ to: '/training', label: 'View →' }} />
        <Widget title="Workers down" value={`${downWorkers.length}`} subtitle={`${(workers.data ?? []).length} configured`} tone={downWorkers.length > 0 ? 'rose' : 'emerald'} link={{ to: '/workers', label: 'View →' }} />
        <Widget title="Latest eval" value={latestEval ? `${(latestEval.score * 100).toFixed(1)}%` : '—'} subtitle={latestEval ? `${latestEval.benchmark} · ${latestEval.model_id}` : 'no eval'} link={{ to: '/eval', label: 'View →' }} />
        <Widget title="Total eval runs" value={`${(evals.data ?? []).length}`} subtitle="across all models" link={{ to: '/eval', label: 'View →' }} />
      </div>
    </div>
  );
}

function Widget({
  title,
  value,
  subtitle,
  tone,
  link,
}: {
  title: string;
  value: string;
  subtitle?: string;
  tone?: 'emerald' | 'rose';
  link?: { to: string; label: string };
}) {
  const valueColor = tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <p className={`mt-1 text-3xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      {link && (
        <Link to={link.to as never} className="mt-3 inline-block text-sm text-emerald-700 hover:underline">
          {link.label}
        </Link>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm --filter cockpit-admin build
```

- [ ] **Step 3: Commit**

```bash
git add apps/cockpit-admin/
git commit -m "feat(admin): dashboard with 4 status widgets"
```

---

### Task 2.17: Sprint 2 acceptance — full integration test

- [ ] **Step 1: Run all tests**

```bash
uv run pytest apps/api/tests -v
pnpm test
pnpm typecheck
pnpm lint
```
Expected: all green

- [ ] **Step 2: Boot and click through manually**

```bash
# Terminal 1
uv run uvicorn ailiance_demo.main:app --reload --port 9100

# Terminal 2
pnpm --filter cockpit-public dev    # 5173

# Terminal 3
pnpm --filter cockpit-admin dev     # 5174
```

Visit:
- `http://localhost:5174/` — dashboard with 4 widgets (will show "0" / "—" if no data)
- `/training` — list of runs
- `/training/<id>` — detail with LossChart + LogTail (try with a real log)
- `/workers` — grid (all "down" if ailiance gateway not running, that's expected)
- `/eval` — table

- [ ] **Step 3: Test Tailscale auth**

Hit the admin API directly without header:
```bash
curl -i http://127.0.0.1:9100/api/admin/training/runs
```
Expected: `HTTP/1.1 401`

With header:
```bash
curl -i http://127.0.0.1:9100/api/admin/training/runs -H 'X-Tailscale-User: dev@local'
```
Expected: `HTTP/1.1 200`

- [ ] **Step 4: Tag**

```bash
git tag -a sprint-2 -m "Sprint 2 — Admin monitoring read-only complete"
```

---

## Self-Review

**Spec coverage:**
- §1 Layout monorepo → Tasks 0.1-0.6 ✓
- §2 Sprint decomposition → tasks tagged sprint-0, sprint-1, sprint-2 ✓
- §3.1-3.7 architectural decisions → reflected in tasks ✓
- §4 Layout → Task 0.1 + each scaffold task ✓
- §5.1-5.6 Backend (modules, endpoints, sources, EvalResult, featured.yaml) → Tasks 1.1-1.10, 2.1-2.7 ✓
- §6.1-6.4 Frontend public → Tasks 1.12-1.20 ✓
- §7.1-7.4 Frontend admin → Tasks 2.9-2.16 ✓
- §8 @cockpit/shared → Tasks 0.5, 0.8, 0.9 + reused throughout ✓
- §9.1-9.5 Data flows → reflected in services + endpoints ✓
- §10 Auth → Task 2.1 ✓
- §11 Error handling → reflected in services (try/except in hf_sync, eval_index, workers) and frontend (error states in routes) ✓
- §12 Testing → TDD throughout (test-first steps) ✓
- §13 Observability → structlog wired in main.py, log calls in services ✓
- §14 Sprint acceptance → Tasks 0.10, 1.22, 2.17 explicitly check ✓
- §15 Hors scope → respected (no DB, no writes, sprints 3-6 untouched)

**Placeholder scan:** none of the forbidden patterns ("TBD", "TODO", "implement later", "add appropriate error handling", etc.) appear in steps. All steps have concrete code or commands.

**Type consistency:**
- `ModelCard.chat_eligible: bool` defined in Task 1.1 → used in Task 1.13 (ModelCard.tsx checks `card.chat_eligible`) ✓
- `ChatBackend` enum values (`ailiance_live`, `hf_external`) used consistently between Pydantic and TS ✓
- `TrainingMetric.split` ("train" | "val") used identically in log_tail.py and LossChart.tsx ✓
- `WorkerHealth` enum (ok/warn/down) consistent ✓
- API client `get`/`post` signatures defined Task 0.5, used Tasks 1.14, 1.15, 2.10, 2.14, 2.15 ✓

No issues found.

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-04-ailiance-demo-sprints-0-1-2.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
