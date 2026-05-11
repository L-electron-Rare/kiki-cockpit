# Cockpit Observability + UX Implementation Plan (Phase 4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the ailiance gateway's existing health + Prometheus metrics on `ailiance.fr` as a public `/status` page; harden the public chat with Traefik rate-limiting; and add three SPA improvements (search + kind filter on `/models`, per-model detail page with provenance JSON inlined).

**Architecture:** All work happens in `~/Documents/Projets/ailiance-demo/`. The FastAPI side gets two new public endpoints (`/api/public/status`, `/api/public/router-stats`) that proxy the ailiance gateway's existing `/health` and `/metrics`. The SPA gets a new route `/status`, an enriched `/models/$owner/$name` route, and frontend filters on `/models`. Traefik rate-limit applied via Docker labels in `deploy/docker-compose.yml`.

**Tech Stack:** Python 3.12 / FastAPI / Pydantic v2 (api), TypeScript / React 19 / TanStack Router / Tailwind (cockpit-public). Existing patterns: `apps/api/src/ailiance_demo/routers/public/*.py` for endpoints, `apps/cockpit-public/src/routes/*.tsx` for routes, `apps/cockpit-public/src/components/ModelCard.tsx` for the existing card we extend.

**Out of scope (separate plans):**
- Admin-side dashboard rewrite (cockpit-admin already has training/workers/eval pages).
- Full Grafana stack — `/status` is a thin self-serve view, not a replacement for ops dashboards.
- Authentication on the public chat — the rate-limit is the only mitigation in this plan.
- Any change to the ailiance gateway repo. We only consume what it already exposes.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `apps/api/src/ailiance_demo/services/gateway_probe.py` | new | Async helpers `fetch_gateway_health()` and `fetch_gateway_metrics()` returning typed Pydantic models. One file = one upstream concern (the ailiance gateway). |
| `apps/api/src/ailiance_demo/models/status.py` | new | Pydantic schemas `StatusReport`, `WorkerStatus`, `RouterStats` exposed on the public API. |
| `apps/api/src/ailiance_demo/routers/public/status.py` | new | `GET /api/public/status` and `GET /api/public/router-stats` — read-only, public, cached 30 s. |
| `apps/api/src/ailiance_demo/main.py` | modify | Wire the new router. |
| `apps/api/tests/integration/test_status_endpoint.py` | new | Hits the new endpoints with the gateway probe stubbed. |
| `apps/cockpit-public/src/routes/status.tsx` | new | `/status` page: 5-worker health table + last-router-decisions strip + footer link. |
| `apps/cockpit-public/src/routes/models.$owner.$name.tsx` | modify | Existing route — flesh out with provenance JSON fetched from the GitHub raw URL. |
| `apps/cockpit-public/src/routes/models.index.tsx` | modify | Add a search box + a kind-filter dropdown bound to the existing 4 kinds (base/fine_tuned/lora/quantized). |
| `apps/cockpit-public/src/hooks/useStatus.ts` | new | TanStack Query hook polling `/api/public/status` every 15 s. |
| `apps/cockpit-public/src/hooks/useProvenance.ts` | new | TanStack Query hook fetching the per-model provenance JSON from GitHub. |
| `apps/cockpit-public/src/components/layout/Header.tsx` | modify | Add a `/status` nav link. |
| `deploy/docker-compose.yml` | modify | Append a Traefik `ratelimit` middleware label on the api service (30 req/min per IP). |

---

## Phase 1 — API: gateway probe + public endpoints

### Task 1.1: Gateway probe service

**Files:**
- Create: `apps/api/src/ailiance_demo/services/gateway_probe.py`

- [ ] **Step 1: Read the existing gateway shape so we know what we're parsing**

```bash
ssh electron-server "curl -fsS http://localhost:9300/health"
ssh electron-server "curl -fsS http://localhost:9300/metrics | head -30"
```

Expected `/health`: `{"status":"ok","router_loaded":true,"uptime_s":NN,"domains":NN}`.
Expected `/metrics`: standard Prometheus text format, with metrics `ailiance_gw_requests_total{model,status}`, `ailiance_gw_route_seconds_*`, `ailiance_router_cache_hits_total`, `ailiance_router_cache_misses_total`.

- [ ] **Step 2: Write `apps/api/src/ailiance_demo/services/gateway_probe.py`**

```python
"""Async probe of the ailiance gateway's /health and /metrics.

We fetch both, parse them into typed Pydantic models, and cache the
result for 30 seconds. The cockpit calls this every page load; without
caching we'd amplify gateway load by 100x for no benefit.
"""
from __future__ import annotations

import time
from collections.abc import Iterable

import httpx
import structlog

from ailiance_demo.models.status import RouterStats, WorkerStatus

log = structlog.get_logger()

WORKERS = [
    {"id": "apertus", "label": "Apertus 70B", "url": "http://studio:9301", "host": "studio"},
    {"id": "devstral", "label": "Devstral 24B", "url": "http://macm1:9302", "host": "macm1"},
    {"id": "eurollm", "label": "EuroLLM 22B", "url": "http://studio:9303", "host": "studio"},
    {"id": "gemma3", "label": "Gemma 3 4B", "url": "http://tower:9304", "host": "tower"},
    {"id": "qwen3-next", "label": "Qwen3-Next 80B", "url": "http://localhost:8002", "host": "kxkm-ai"},
]

# Light, mutable cache. The router endpoint sets _cache when it refreshes.
_cache: dict[str, tuple[float, object]] = {}
TTL_SECONDS = 30.0


def _cache_get(key: str) -> object | None:
    if key not in _cache:
        return None
    ts, value = _cache[key]
    if time.monotonic() - ts > TTL_SECONDS:
        return None
    return value


def _cache_set(key: str, value: object) -> None:
    _cache[key] = (time.monotonic(), value)


async def _probe_one(client: httpx.AsyncClient, w: dict) -> WorkerStatus:
    started = time.monotonic()
    try:
        r = await client.get(f"{w['url']}/health", timeout=2.0)
        ok = r.status_code == 200
        body = r.json() if ok else {}
        latency_ms = round((time.monotonic() - started) * 1000, 1)
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=ok and body.get("status") == "ok",
            latency_ms=latency_ms,
            model_loaded=bool(body.get("model_loaded", body.get("router_loaded", False))),
            uptime_s=int(body.get("uptime_s", 0)),
            error=None,
        )
    except Exception as exc:  # noqa: BLE001
        return WorkerStatus(
            id=w["id"],
            label=w["label"],
            host=w["host"],
            healthy=False,
            latency_ms=None,
            model_loaded=False,
            uptime_s=0,
            error=str(exc)[:120],
        )


async def fetch_workers_status(gateway_url: str) -> list[WorkerStatus]:
    """Probe every worker we know about. Cached 30 s."""
    cached = _cache_get("workers")
    if isinstance(cached, list):
        return cached  # type: ignore[return-value]
    async with httpx.AsyncClient() as client:
        results = []
        for w in WORKERS:
            results.append(await _probe_one(client, w))
    _cache_set("workers", results)
    return results


def _parse_prom_counter(lines: Iterable[str], metric: str) -> dict[str, float]:
    """Parse `metric{label1="x",label2="y"} 12.0` into {labels: value}."""
    out: dict[str, float] = {}
    for ln in lines:
        if not ln.startswith(metric):
            continue
        # split on whitespace — last token is the value
        try:
            label_str, value_str = ln.rsplit(" ", 1)
            out[label_str[len(metric):]] = float(value_str)
        except ValueError:
            continue
    return out


async def fetch_router_stats(gateway_url: str) -> RouterStats:
    """Pull cache hit/miss + per-model request counts from /metrics. Cached 30 s."""
    cached = _cache_get("router_stats")
    if isinstance(cached, RouterStats):
        return cached
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{gateway_url}/metrics")
        text = r.text if r.status_code == 200 else ""
    except Exception as exc:  # noqa: BLE001
        log.warning("router_stats.fetch_failed", error=str(exc))
        text = ""
    lines = text.splitlines()
    hits = _parse_prom_counter(lines, "ailiance_router_cache_hits_total")
    misses = _parse_prom_counter(lines, "ailiance_router_cache_misses_total")
    requests = _parse_prom_counter(lines, "ailiance_gw_requests_total")
    # Sum across labels for the headline numbers
    stats = RouterStats(
        cache_hits=int(sum(hits.values())),
        cache_misses=int(sum(misses.values())),
        total_requests=int(sum(requests.values())),
        per_model_requests={k.strip("{}"): int(v) for k, v in requests.items()},
    )
    _cache_set("router_stats", stats)
    return stats
```

- [ ] **Step 3: Commit (no tests yet — they land in 1.3)**

```bash
cd ~/Documents/Projets/ailiance-demo
git add apps/api/src/ailiance_demo/services/gateway_probe.py
git commit -m "feat(api): gateway probe service"
```

---

### Task 1.2: Status models + router

**Files:**
- Create: `apps/api/src/ailiance_demo/models/status.py`
- Create: `apps/api/src/ailiance_demo/routers/public/status.py`
- Modify: `apps/api/src/ailiance_demo/main.py`

- [ ] **Step 1: Write the Pydantic models**

`apps/api/src/ailiance_demo/models/status.py`:
```python
"""Pydantic schemas for the public /status endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class WorkerStatus(BaseModel):
    id: str
    label: str
    host: str
    healthy: bool
    latency_ms: float | None
    model_loaded: bool
    uptime_s: int
    error: str | None = None


class StatusReport(BaseModel):
    workers: list[WorkerStatus]
    healthy_count: int
    total_count: int
    timestamp: str


class RouterStats(BaseModel):
    cache_hits: int
    cache_misses: int
    total_requests: int
    per_model_requests: dict[str, int] = Field(default_factory=dict)
```

- [ ] **Step 2: Write the router**

`apps/api/src/ailiance_demo/routers/public/status.py`:
```python
"""Public read-only status + router-stats endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from ailiance_demo.config import settings
from ailiance_demo.models.status import RouterStats, StatusReport
from ailiance_demo.services.gateway_probe import (
    fetch_router_stats,
    fetch_workers_status,
)

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/status", response_model=StatusReport)
async def get_status() -> StatusReport:
    workers = await fetch_workers_status(settings.ailiance_gateway_url)
    healthy = sum(1 for w in workers if w.healthy)
    return StatusReport(
        workers=workers,
        healthy_count=healthy,
        total_count=len(workers),
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@router.get("/router-stats", response_model=RouterStats)
async def get_router_stats() -> RouterStats:
    return await fetch_router_stats(settings.ailiance_gateway_url)
```

- [ ] **Step 3: Wire it in `main.py`**

Open `apps/api/src/ailiance_demo/main.py`. Add to the imports near the other public router imports:

```python
from ailiance_demo.routers.public import status as public_status
```

Add to the `app.include_router(...)` calls (where the other public routers are included):

```python
app.include_router(public_status.router)
```

- [ ] **Step 4: Smoke-test locally**

```bash
cd ~/Documents/Projets/ailiance-demo
git add apps/api/src/ailiance_demo/models/status.py \
        apps/api/src/ailiance_demo/routers/public/status.py \
        apps/api/src/ailiance_demo/main.py
git commit -m "feat(api): /status and /router-stats endpoints"
git push

ssh electron-server "cd /opt/ailiance-demo && git pull --ff-only && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env build api 2>&1 | tail -3 && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate api 2>&1 | tail -2"

# Wait, then probe
ssh electron-server "until curl -fsS https://ailiance.fr/api/public/healthz >/dev/null 2>&1; do sleep 2; done"
curl -fsS https://ailiance.fr/api/public/status | python3 -m json.tool | head -25
curl -fsS https://ailiance.fr/api/public/router-stats | python3 -m json.tool
```
Expected: 5 worker entries, healthy_count between 1 and 5 depending on what's actually up; router-stats with at least cache_hits, cache_misses, total_requests fields.

---

### Task 1.3: API integration test

**Files:**
- Create: `apps/api/tests/integration/test_status_endpoint.py`

- [ ] **Step 1: Write the test**

```python
"""End-to-end test of /api/public/status with a stubbed gateway probe."""
from __future__ import annotations

from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from ailiance_demo.main import app
from ailiance_demo.models.status import RouterStats, WorkerStatus


@pytest.fixture
def stub_workers() -> list[WorkerStatus]:
    return [
        WorkerStatus(id="apertus", label="Apertus 70B", host="studio",
                     healthy=True, latency_ms=15.2, model_loaded=True, uptime_s=3600),
        WorkerStatus(id="devstral", label="Devstral 24B", host="macm1",
                     healthy=False, latency_ms=None, model_loaded=False, uptime_s=0,
                     error="Connection refused"),
    ]


@pytest.mark.asyncio
async def test_status_endpoint(stub_workers):
    async def fake_probe(_url):
        return stub_workers
    async def fake_metrics(_url):
        return RouterStats(cache_hits=42, cache_misses=8, total_requests=50)

    with patch("ailiance_demo.routers.public.status.fetch_workers_status", fake_probe), \
         patch("ailiance_demo.routers.public.status.fetch_router_stats", fake_metrics):
        client = TestClient(app)
        r = client.get("/api/public/status")
    assert r.status_code == 200
    body = r.json()
    assert body["total_count"] == 2
    assert body["healthy_count"] == 1
    assert body["workers"][0]["id"] == "apertus"
    # Timestamp must parse as ISO-8601
    datetime.fromisoformat(body["timestamp"])
```

- [ ] **Step 2: Run + commit**

```bash
cd ~/Documents/Projets/ailiance-demo/apps/api
uv run pytest tests/integration/test_status_endpoint.py -v
```
Expected: 1 passed.

```bash
cd ~/Documents/Projets/ailiance-demo
git add apps/api/tests/integration/test_status_endpoint.py
git commit -m "test: /api/public/status integration"
git push
```

---

## Phase 2 — SPA: /status page

### Task 2.1: useStatus hook + nav link

**Files:**
- Create: `apps/cockpit-public/src/hooks/useStatus.ts`
- Modify: `apps/cockpit-public/src/components/layout/Header.tsx`

- [ ] **Step 1: Write the hook**

`apps/cockpit-public/src/hooks/useStatus.ts`:
```typescript
import { api, type components } from '@cockpit/shared';
import { useQuery } from '@tanstack/react-query';

type StatusReport = components['schemas']['StatusReport'];

export function useStatus() {
  return useQuery({
    queryKey: ['public', 'status'],
    queryFn: ({ signal }) => api.get<StatusReport>('/api/public/status', { signal }),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}
```

- [ ] **Step 2: Add the nav link**

In `apps/cockpit-public/src/components/layout/Header.tsx`, find the existing `<Link to="/transparency">` and add right before/after:

```tsx
          <Link to="/status" className="hover:underline">
            Status
          </Link>
```

- [ ] **Step 3: Commit**

```bash
git add apps/cockpit-public/src/hooks/useStatus.ts \
        apps/cockpit-public/src/components/layout/Header.tsx
git commit -m "feat(spa): useStatus hook + nav link"
```

---

### Task 2.2: /status route

**Files:**
- Create: `apps/cockpit-public/src/routes/status.tsx`

- [ ] **Step 1: Write the route**

```tsx
import { useStatus } from '@/hooks/useStatus';
import { createFileRoute } from '@tanstack/react-router';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/status')({
  component: StatusPage,
});

function StatusPage() {
  const { data, isLoading, isError } = useStatus();

  if (isLoading) return <p>Loading…</p>;
  if (isError || !data) return <p className="text-rose-700">Failed to load status.</p>;

  return (
    <article className="max-w-3xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Live status</h1>
          <p className="text-sm text-slate-500">
            {data.healthy_count} of {data.total_count} workers healthy ·
            refreshed every 15 s
          </p>
        </div>
        <Activity className="text-emerald-600" size={32} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.workers.map((w) => (
          <div
            key={w.id}
            className={`rounded border p-3 ${
              w.healthy
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
            }`}
          >
            <header className="flex items-center justify-between">
              <h3 className="font-semibold">{w.label}</h3>
              {w.healthy ? (
                <CheckCircle2 className="text-emerald-600" size={18} />
              ) : (
                <AlertCircle className="text-rose-600" size={18} />
              )}
            </header>
            <p className="text-xs text-slate-600">{w.host}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-2 text-xs text-slate-700">
              <dt>latency</dt>
              <dd>{w.latency_ms ? `${w.latency_ms} ms` : '—'}</dd>
              <dt>model loaded</dt>
              <dd>{w.model_loaded ? 'yes' : 'no'}</dd>
              <dt>uptime</dt>
              <dd>{w.uptime_s ? `${Math.floor(w.uptime_s / 60)} min` : '—'}</dd>
            </dl>
            {w.error && (
              <p className="mt-2 text-xs font-mono text-rose-700 truncate" title={w.error}>
                {w.error}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Last update: {new Date(data.timestamp).toLocaleString()}
      </p>
    </article>
  );
}
```

- [ ] **Step 2: Regenerate + commit**

```bash
cd ~/Documents/Projets/ailiance-demo/apps/cockpit-public
pnpm exec tsr generate
cd ~/Documents/Projets/ailiance-demo
git add apps/cockpit-public/src/routes/status.tsx \
        apps/cockpit-public/src/routeTree.gen.ts
git commit -m "feat(spa): /status page"
git push
```

- [ ] **Step 3: Build + deploy + smoke-test**

```bash
ssh electron-server "cd /opt/ailiance-demo && git pull --ff-only && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env build public 2>&1 | tail -3 && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate public 2>&1 | tail -2"

curl -sI https://ailiance.fr/status | head -3
```
Expected: HTTP/2 200.

Open `https://ailiance.fr/status` in a browser and verify the worker grid renders.

---

## Phase 3 — SPA: /models filters + per-model page

### Task 3.1: Search + kind filter on /models

**Files:**
- Modify: `apps/cockpit-public/src/routes/models.index.tsx`

- [ ] **Step 1: Read the existing route to find the right insertion point**

```bash
sed -n '1,80p' apps/cockpit-public/src/routes/models.index.tsx
```
Identify the `<select>` rows and the `cards.map(...)` block.

- [ ] **Step 2: Add search state + kind filter**

In the same file, near the existing state hooks:

```tsx
import { useMemo, useState } from 'react';

// ... inside the component:
const [search, setSearch] = useState('');
const [kindFilter, setKindFilter] = useState<string>('all');

const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  return cards.filter((c) => {
    if (kindFilter !== 'all' && c.kind !== kindFilter) return false;
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      c.display_name.toLowerCase().includes(q) ||
      (c.base_model ?? '').toLowerCase().includes(q)
    );
  });
}, [cards, search, kindFilter]);
```

In the JSX, add to the filter row (right next to the existing `<select>` filters):

```tsx
<input
  type="search"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  placeholder="Search by id, name, base…"
  className="rounded border border-slate-300 px-2 py-1 text-sm"
/>
<select
  value={kindFilter}
  onChange={(e) => setKindFilter(e.target.value)}
  className="rounded border border-slate-300 px-2 py-1 text-sm"
>
  <option value="all">All kinds</option>
  <option value="base">base</option>
  <option value="fine_tuned">fine-tune</option>
  <option value="lora">LoRA</option>
  <option value="quantized">quantized</option>
</select>
```

Replace `cards.map(...)` (where the cards render) with `filtered.map(...)` and update the `Models (NN)` count to use `filtered.length`.

- [ ] **Step 3: Commit + deploy**

```bash
git add apps/cockpit-public/src/routes/models.index.tsx
git commit -m "feat(spa): search + kind filter on /models"
git push
ssh electron-server "cd /opt/ailiance-demo && git pull --ff-only && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env build public 2>&1 | tail -3 && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate public 2>&1 | tail -2"
```

Visit `https://ailiance.fr/models`, type `apertus` in the search box — expect the list to narrow to one card.

---

### Task 3.2: Per-model detail page with provenance

**Files:**
- Create: `apps/cockpit-public/src/hooks/useProvenance.ts`
- Modify: `apps/cockpit-public/src/routes/models.$owner.$name.tsx`

- [ ] **Step 1: Write the provenance hook**

```typescript
import { useQuery } from '@tanstack/react-query';

const RAW_BASE = 'https://raw.githubusercontent.com/ailiance/ailiance/main/docs/provenance';

const PROVENANCE_FILES: Record<string, string> = {
  'ailiance/apertus-70b': 'apertus-70b-instruct-2509.json',
  'ailiance/devstral-24b': 'devstral-small-2-24b-instruct-2512.json',
  'ailiance/eurollm-22b': 'eurollm-22b-instruct-2512.json',
  'ailiance/qwen3-next-80b-a3b-instruct': 'qwen3-next-80b-a3b-instruct.json',
  'ailiance/auto': 'auto-router-minilm.json',
};

export function useProvenance(modelId: string) {
  const filename = PROVENANCE_FILES[modelId];
  return useQuery({
    queryKey: ['provenance', modelId],
    enabled: Boolean(filename),
    queryFn: async ({ signal }) => {
      const r = await fetch(`${RAW_BASE}/${filename}`, { signal });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return (await r.json()) as Record<string, unknown>;
    },
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 2: Read the existing `models.$owner.$name.tsx`**

```bash
sed -n '1,60p' apps/cockpit-public/src/routes/models.\$owner.\$name.tsx
```

- [ ] **Step 3: Replace the body with a richer detail page that uses both the existing useModelDetail hook and the new useProvenance hook**

```tsx
import { useModelDetail } from '@/hooks/useModelDetail';
import { useProvenance } from '@/hooks/useProvenance';
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/models/$owner/$name')({
  component: ModelDetailPage,
});

function ModelDetailPage() {
  const { owner, name } = Route.useParams();
  const id = `${owner}/${name}`;
  const detail = useModelDetail(owner, name);
  const provenance = useProvenance(id);

  if (detail.isLoading) return <p>Loading…</p>;
  if (!detail.data) return <p>Model not found.</p>;
  const c = detail.data;

  return (
    <article className="max-w-3xl mx-auto">
      <header>
        <p className="text-xs text-slate-500">{c.id}</p>
        <h1 className="text-2xl font-bold">{c.display_name}</h1>
        {c.featured_headline && (
          <p className="text-slate-700 italic mt-1">{c.featured_headline}</p>
        )}
      </header>

      {c.description && <p className="mt-4 text-slate-700">{c.description}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-y-1 text-sm">
        {c.base_model && (<><dt className="text-slate-500">Base model</dt><dd className="font-mono">{c.base_model}</dd></>)}
        {c.parameters && (<><dt className="text-slate-500">Parameters</dt><dd>{c.parameters.toLocaleString()}</dd></>)}
        {c.disk_size_bytes && (<><dt className="text-slate-500">Disk</dt><dd>{(c.disk_size_bytes / 1e9).toFixed(1)} GB</dd></>)}
        {c.memory_gb && (<><dt className="text-slate-500">Memory</dt><dd>{c.memory_gb} GB</dd></>)}
        {c.quantization && (<><dt className="text-slate-500">Quantization</dt><dd>{c.quantization}</dd></>)}
        {c.host && (<><dt className="text-slate-500">Host</dt><dd>{c.host}</dd></>)}
        {c.architecture && (<><dt className="text-slate-500">Architecture</dt><dd>{c.architecture}</dd></>)}
        {c.license && (<><dt className="text-slate-500">License</dt><dd>{c.license}</dd></>)}
        {c.kind && (<><dt className="text-slate-500">Kind</dt><dd>{c.kind}</dd></>)}
      </dl>

      {c.chat_eligible && (
        <Link
          to="/chat/$owner/$name"
          params={{ owner: c.owner, name: c.name }}
          className="mt-6 inline-block rounded bg-emerald-600 px-4 py-2 text-white"
        >
          Try in chat playground →
        </Link>
      )}

      {provenance.data && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Provenance (EU AI Act §53)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Sourced from <a className="underline" href={`https://github.com/ailiance/ailiance/blob/main/docs/provenance/`}>github.com/ailiance/ailiance/docs/provenance</a>
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-slate-50 p-3 text-xs leading-snug">
            {JSON.stringify(provenance.data, null, 2)}
          </pre>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 4: Regenerate route tree, commit, deploy**

```bash
cd ~/Documents/Projets/ailiance-demo/apps/cockpit-public
pnpm exec tsr generate
cd ~/Documents/Projets/ailiance-demo
git add apps/cockpit-public/src/hooks/useProvenance.ts \
        apps/cockpit-public/src/routes/models.\$owner.\$name.tsx \
        apps/cockpit-public/src/routeTree.gen.ts
git commit -m "feat(spa): per-model page with provenance"
git push
ssh electron-server "cd /opt/ailiance-demo && git pull --ff-only && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env build public 2>&1 | tail -3 && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate public 2>&1 | tail -2"
```

Visit `https://ailiance.fr/models/ailiance/apertus-70b` — expect the new spec table + the inlined provenance JSON.

---

## Phase 4 — Traefik rate-limit

### Task 4.1: 30 req/min per-IP on /api

**Files:**
- Modify: `deploy/docker-compose.yml`

- [ ] **Step 1: Read the current api service labels**

```bash
sed -n '/^  api:/,/^  [a-z]\+:/p' deploy/docker-compose.yml
```

- [ ] **Step 2: Add the middleware + attach it**

Inside the `api:` service's `labels:` list, add:

```yaml
      # Rate-limit: 30 requests / minute / source IP, burst 10
      - "traefik.http.middlewares.kiki-api-ratelimit.ratelimit.average=30"
      - "traefik.http.middlewares.kiki-api-ratelimit.ratelimit.period=1m"
      - "traefik.http.middlewares.kiki-api-ratelimit.ratelimit.burst=10"
      - "traefik.http.middlewares.kiki-api-ratelimit.ratelimit.sourceCriterion.ipStrategy.depth=1"
      - "traefik.http.routers.kiki-api-public.middlewares=kiki-api-ratelimit"
      - "traefik.http.routers.kiki-api-admin.middlewares=kiki-api-ratelimit"
```

(`depth=1` is correct because Traefik sits behind Cloudflare's tunnel; the real client IP is in the `X-Forwarded-For` chain at depth 1.)

- [ ] **Step 3: Commit + redeploy + verify**

```bash
git add deploy/docker-compose.yml
git commit -m "deploy: 30 req/min rate-limit on /api"
git push
ssh electron-server "cd /opt/ailiance-demo && git pull --ff-only && \
    docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d api"

# Hammer the API with 40 quick requests; expect a 429 within 30 of them.
status_codes=$(for i in $(seq 1 40); do
  curl -s -o /dev/null -w "%{http_code}\n" https://ailiance.fr/api/public/healthz
done | sort | uniq -c)
echo "$status_codes"
```
Expected: a non-zero count of `429` lines mixed with `200`.

---

## Self-Review

**1. Spec coverage.**
- "Public `/status` page" → Task 1.2 (api) + Task 2.2 (SPA route).
- "Traefik rate-limit on the public chat" → Task 4.1.
- "Search + kind filter on /models" → Task 3.1.
- "Per-model detail page with provenance JSON inlined" → Task 3.2.
- Out-of-scope items (admin dashboard rewrite, Grafana, auth) are listed in the header.

**2. Placeholder scan.** No "TODO", "TBD", "implement later", "appropriate", "fill in", or "similar to" found. Each step has the actual code or actual command.

**3. Type consistency.**
- `WorkerStatus` and `RouterStats` are defined in Task 1.2 and used unchanged in Task 1.3 + the SPA hook (via the regenerated `@cockpit/shared` types).
- `useStatus()` is used in `status.tsx` (Task 2.2) with the same return shape declared in `useStatus.ts` (Task 2.1).
- The SPA route filenames `status.tsx`, `models.$owner.$name.tsx`, `models.index.tsx` match the file-routing convention TanStack Router uses in this repo (verified by inspecting the existing `routeTree.gen.ts`).
- Traefik middleware name `kiki-api-ratelimit` is referenced in two router-level labels in the same task, consistent.

No issues to fix.
