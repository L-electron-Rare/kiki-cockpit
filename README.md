<div align="center">

# ailiance-demo

### Vitrine publique + console d'admin de la flotte LLM ailiance — 5 workers, provenance EU AI Act, chat live

[![live](https://img.shields.io/badge/live-ailiance.fr-7e3af2)](https://ailiance.fr)
[![status](https://img.shields.io/badge/fleet-5%2F5%20healthy-success)](https://ailiance.fr/api/public/status)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
[![api](https://img.shields.io/badge/api-FastAPI-009688)](apps/api)
[![spa](https://img.shields.io/badge/SPA-React%2019%20%2B%20Vite-61dafb)](apps/cockpit-public)

**Public** → [`ailiance.fr`](https://ailiance.fr) · **Admin (Tailscale-only)** → [`admin.ailiance.fr`](https://admin.ailiance.fr) · **Status** → [`/api/public/status`](https://ailiance.fr/api/public/status)

</div>

---

## C'est quoi

Le front-end de la flotte LLM [ailiance](https://github.com/ailiance/ailiance). Deux applications, un seul backend FastAPI :

- **Vitrine publique** — galerie des modèles servis (5 workers ailiance + 24 modèles publiés sur HuggingFace), provenance EU AI Act inlinée par modèle, chat playground avec streaming SSE, page `/transparency`, page `/status` live.
- **Admin (Tailscale-only)** — monitoring des runs de training, santé workers, résultats d'éval, futurs sprints orchestration eval/train.

Une seule API FastAPI sert les deux frontends. Rate-limiting Traefik (30 req/min/IP) sur tout `/api`.

## Architecture

```mermaid
flowchart TB
    user([👤 Public])
    op([🔧 Opérateur tailnet])

    subgraph cloudflare["Cloudflare"]
        cf_proxy["ailiance.fr<br/>(proxied)"]
        cf_dns["admin.ailiance.fr<br/>(DNS-only)"]
    end

    user -->|HTTPS| cf_proxy
    op -->|Tailscale| cf_dns

    subgraph electron["electron-server (Docker host, Traefik)"]
        rl["Traefik<br/>middleware kiki-api-ratelimit<br/>30 req/min/IP"]

        subgraph cockpit["docker compose: ailiance-demo"]
            spa_pub["public<br/>React 19 + Vite<br/>:80"]
            spa_adm["admin<br/>React 19 + Vite<br/>:80"]
            api["api · FastAPI<br/><b>:9100</b><br/>5 workers probe + chat proxy"]
        end

        rl -->|/api| api
        rl --> spa_pub
        rl --> spa_adm
    end

    cf_proxy -.-> rl
    cf_dns -.-> rl

    api -.->|host.docker.internal:9300| ailiance

    subgraph ailiance["ailiance gateway :9300"]
        gw["MiniLM router-v6<br/>32 domaines · 87.7 % top-1"]
        gw --> w1["studio<br/>Apertus / EuroLLM"]
        gw --> w2["macm1<br/>Devstral"]
        gw --> w3["tower<br/>Gemma 3"]
        gw -.->|autossh| w4["kxkm-ai<br/>Qwen3-Next 80B<br/>RTX 4090"]
    end

    classDef pub fill:#fee2e2,stroke:#991b1b
    classDef stack fill:#ede9fe,stroke:#5b21b6
    classDef sov fill:#dbeafe,stroke:#1e40af
    class cloudflare pub
    class cockpit,electron stack
    class ailiance sov
```

## Endpoints

### Publics (`/api/public/*`)

| Route | Effet |
|---|---|
| `GET /api/public/healthz` | liveness |
| `GET /api/public/models` | catalogue : 5 cards live ailiance + auto-router + ce qu'expose le HF cache (clemsail/*, electron-rare/*) |
| `GET /api/public/models/{owner}/{name}` | détail + provenance JSON inline |
| `GET /api/public/status` | santé live des 5 workers (cache 30 s) |
| `GET /api/public/router-stats` | métriques Prometheus du router (cache hits / misses, latence) |
| `POST /api/public/chat` | proxy SSE vers ailiance gateway, slowapi 30/min |

### Admin (`/api/admin/*`, Tailscale-only)

| Route | Effet |
|---|---|
| `GET /api/admin/workers/status` | ping de la liste `workers_to_check` (gateway + 5 workers) |
| `GET /api/admin/training-runs` | runs MLX-LM via collector :9150 (filesystem-on-studio shim) |
| `GET /api/admin/eval-runs` | catalogue eval, résultats agrégés |

Auth admin : header `X-Tailscale-User` injecté par Traefik (cf. [`apps/api/src/ailiance_demo/auth/tailscale.py`](apps/api/src/ailiance_demo/auth/tailscale.py)).

## Cycle d'une requête de chat

```mermaid
sequenceDiagram
    autonumber
    participant U as Utilisateur
    participant CF as Cloudflare
    participant T as Traefik (electron-server)
    participant A as ailiance-demo api
    participant G as ailiance gateway
    participant W as Worker

    U->>CF: POST /api/public/chat<br/>{model_id, messages}
    CF->>T: forward
    T->>T: middleware kiki-api-ratelimit<br/>30 req/min/IP (depth=1)
    T->>A: forward
    A->>A: slowapi 30/min<br/>(défense en profondeur)
    A->>A: is_chat_eligible(model_id) ?
    A->>G: POST /v1/chat/completions<br/>(via host.docker.internal:9300)
    G->>W: forward (worker port)
    W-->>G: SSE tokens
    G-->>A: SSE
    A-->>T: SSE proxy
    T-->>CF: SSE
    CF-->>U: live token stream
```

## Vitrine publique — pages

```mermaid
flowchart LR
    home["/<br/>landing"]
    models["/models<br/>galerie · search + kindFilter"]
    detail["/models/:owner/:name<br/>fiche + provenance JSON"]
    status["/status<br/>live worker grid<br/>refetch 15 s"]
    transparency["/transparency<br/>tableau modèles + dossier EU AI Act"]
    about["/about<br/>pitch + portabilité backend<br/>(Apple Silicon · CUDA · ROCm · CPU)"]

    home --> models
    models --> detail
    home --> status
    home --> transparency
    home --> about

    classDef pg fill:#dbeafe,stroke:#1e40af
    class home,models,detail,status,transparency,about pg
```

`React 19` + `Vite` + `TanStack Router` (file-based) + `TanStack Query` (cache 5 min sur les provenances, 10 s staleTime sur status).

## Stack technique

| Couche | Outil |
|---|---|
| **API** | FastAPI 0.118 + Pydantic v2 + uvicorn (Python 3.14, uv) |
| **Vitrine publique** | React 19 + Vite + TanStack Router + TanStack Query |
| **Admin** | React 19 + Vite + TanStack Router + auth Tailscale header |
| **Shared** | `@cockpit/shared` — types, UI primitives, hooks |
| **Tests api** | pytest + pytest-asyncio + httpx mock |
| **Tests SPA** | Vitest + React Testing Library |
| **Build & deploy** | `docker compose -f deploy/docker-compose.yml` derrière Traefik 3 (cert-resolver Let's Encrypt) |
| **Source d'observabilité workers** | probe HTTP direct vers `studio:9301`, `macm1:9302`, `studio:9303`, `tower:9304`, `host.docker.internal:8002` (qwen via tunnel autossh) |

## Sources de vérité

```mermaid
flowchart LR
    PROV["📁 ailiance/docs/provenance/<br/>5 JSON Annex IV §1(c)"]
    API["apps/api · _LIVE_DETAILS<br/>5 cards live (host, port, quant)"]
    PROXY["chat_proxy · ALIAS_TO_GATEWAY_MODEL<br/>5 alias ailiance/* + auto"]
    PROBE["gateway_probe · WORKERS<br/>5 entrées probées toutes les 30 s"]

    PROV -- raw.githubusercontent --> SPA1["SPA · useProvenance<br/>fetch JSON par modèle"]
    API --> SPA2["SPA · /models galerie + /models/:id détail"]
    PROXY --> SPA3["SPA · /chat (model_id supporté)"]
    PROBE --> SPA4["SPA · /status (live)"]

    classDef src fill:#fef3c7,stroke:#92400e
    classDef sink fill:#d1fae5,stroke:#065f46
    class PROV,API,PROXY,PROBE src
    class SPA1,SPA2,SPA3,SPA4 sink
```

Quand on ajoute / retire un modèle servi, **les 4 listes doivent bouger ensemble** (test `test_workers_constant_matches_production_fleet` enforce que `WORKERS` correspond bien à la production).

## Démarrage rapide (dev)

```bash
git clone https://github.com/ailiance/ailiance-demo.git
cd ailiance-demo
pnpm install
uv sync
pnpm dev          # boots api + public + admin en parallèle
```

Tests :

```bash
# API
cd apps/api && uv run pytest tests/ -q

# SPA
cd apps/cockpit-public && pnpm test
cd apps/cockpit-admin && pnpm test
```

## Déploiement

```bash
# depuis electron-server, /opt/ailiance-demo
git pull --ff-only
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build api public admin
```

Le `docker-compose.yml` déclare les routers Traefik (`kiki-api-public`, `kiki-api-admin`, `kiki-public`, `kiki-admin`) et la middleware `kiki-api-ratelimit`. Cert-resolver `letsencrypt`. Réseau externe `traefik` requis (Traefik 3 déjà running sur l'host).

## Variables d'environnement

| Clef | Effet | Défaut |
|---|---|---|
| `COCKPIT_HOST` / `COCKPIT_PORT` | bind FastAPI | `0.0.0.0:9100` |
| `COCKPIT_LOG_LEVEL` | niveau de log uvicorn | `INFO` |
| `COCKPIT_AILIANCE_GATEWAY_URL` | passerelle ailiance | `http://host.docker.internal:9300` |
| `COCKPIT_HF_TOKEN` | jeton HF pour `hf_cache` | (vide → unauthenticated) |
| `COCKPIT_TRAINING_LOG_ROOTS` | racines filesystem direct | `[]` (utilise collector) |
| `COCKPIT_COLLECTOR_BASE_URL` | shim filesystem-on-studio | `http://studio:9150` |

## Layout monorepo

```
ailiance-demo/
├── apps/
│   ├── api/                       FastAPI service
│   │   └── src/ailiance_demo/
│   │       ├── routers/
│   │       │   ├── public/        models, chat, status, healthz
│   │       │   └── admin/         workers, training, eval (Tailscale auth)
│   │       └── services/
│   │           ├── chat_proxy.py        ALIAS_TO_GATEWAY_MODEL
│   │           ├── gateway_probe.py     WORKERS list + probe + cache 30s
│   │           ├── hf_cache.py          HF Hub mirror
│   │           └── eval_index.py        eval results catalogue
│   ├── cockpit-public/            React 19 vitrine
│   │   └── src/
│   │       ├── routes/            file-based TanStack Router
│   │       ├── hooks/             useStatus, useProvenance, useModels…
│   │       └── components/layout/ Header, Footer
│   └── cockpit-admin/             React 19 admin (Tailscale-only)
├── packages/shared/               @cockpit/shared (types, UI primitives)
└── deploy/
    └── docker-compose.yml         Traefik labels, rate-limit middleware
```

## Tests verts (2026-05-06)

```bash
cd apps/api && uv run pytest tests/integration/test_status_endpoint.py \
                              tests/integration/test_models_endpoint.py \
                              tests/integration/test_workers_endpoint.py
# 7 passed
```

`test_workers_constant_matches_production_fleet` est le canari : il échoue si on retire un alias ailiance/* sans aussi mettre à jour `WORKERS`.

## Sister projects

- [`ailiance`](https://github.com/ailiance/ailiance) — la passerelle LLM elle-même (workers, router-v6, dossier EU AI Act).
- [`agent-kiki`](https://github.com/ailiance/ailiance-agent) — agent de code (CLI `aki` + extension VS Code) qui pointe sur cette passerelle par défaut.

## Licence

Apache-2.0.

---

<div align="center">
<sub>Built in France 🇫🇷 · No cloud · Apache-2.0 · <a href="https://ailiance.fr">ailiance.fr</a></sub>
</div>
