# Design — `ailiance-demo` : frontend pour entraînement, évaluation et test des modèles

**Date** : 2026-05-04
**Auteur** : Brainstorming session (Claude Opus 4.7 + Clément Saillant)
**Statut** : Validé section par section, prêt pour `writing-plans`

---

## 1. Contexte et objectif

L'écosystème ML d'Électron Rare comprend aujourd'hui :

- **`ailiance-mac-tuner`** (public, GitHub) : MLX fine-tuning toolkit sur Mac Studio M3 Ultra (512 GB), distille Claude Opus dans Mistral Large 123B, Qwen3.5-122B-A10B, etc. Inclut une TUI terminal (`scripts/training_tui.py`) qui parse les logs `mlx_lm` en temps réel.
- **`ailiance`** (privé, GitHub) : pipeline LLM EU-souverain — Apertus 70B + Devstral 24B + EuroLLM 22B, gateway FastAPI sur `:9200`, workers MLX sur `:9301/:9302/:9303`, conformité EU AI Act Art. 52/53. Suite d'évaluation reproductible (Lighteval, EvalPlus, MT-Bench + benchmarks maison) fraîchement poussée dans `eval/`.
- **24 modèles publiés sur HuggingFace** : 16 sous `clemsail/*` (compte perso) + 8 sous `electron-rare/*` (org), dont `micro-kiki-v3` (242 dl, 4♥), 10 adapters domaine SFT (KiCad, STM32, PlatformIO, IoT, FreeCAD, Power, EMC, SPICE, Embedded, DSP), et 6 versions récentes à 0 dl (model cards à compléter).
- **Multi-machine via Tailscale** : studio (M3 Ultra, GPU principal), GrosMac (M-series), kxkm-ai (RTX 4090, Linux), electron-server (Linux, host), kx6tm-23 (Linux), tower (Linux).

**Objectif** : remplacer/étendre les outils CLI existants par un frontend web qui couvre, dans cet ordre :

1. Une **vitrine publique** showcase de la flotte de modèles (provenance EU AI Act, scores d'éval, chat playground)
2. Un **cockpit admin** pour monitoring / éval / training launch / lifecycle / debug — sur Tailscale uniquement

Le projet est découpé en **7 sprints** (0-6). Ce design couvre **les sprints 0 + 1 + 2** ; les sprints 3-6 auront leurs propres designs.

---

## 2. Décomposition en sprints

| Sprint | Sous-projet | Couvert par ce design |
|---|---|---|
| **0 — Foundation** | Contrat API + auth Tailscale + repo skeleton + tooling | ✅ |
| **1 — Vitrine + Playground** | Public site (galerie + provenance + chat) | ✅ |
| **2 — Monitoring read-only** | Dashboard admin live (trainings, workers, eval results) | ✅ |
| 3 — Eval orchestrator | Lancer évals on-demand depuis UI | ❌ design séparé |
| 4 — Training launcher | Spawn `train_*.py` à distance via Tailnet + queue | ❌ design séparé |
| 5 — Lifecycle / HF publish | Push HF, model cards, archivage | ❌ design séparé |
| 6 — Debug REPL + diff 2-modèles | Power-user playground | ❌ design séparé |

**Hors scope** explicite de ce design : tout ce qui touche aux *writes* (lancer un training, publier sur HF, queue de jobs, persistence DB). Les sprints 0-2 sont **read-only** sur les artefacts existants.

---

## 3. Décisions architecturales

### 3.1 Périmètre utilisateur

- **Public read-only + admin Tailscale-only** (Q1 = c)
- Public : galerie + provenance + chat playground (Q2 = b)
- Admin : full scope = monitoring + éval + training launch + lifecycle + REPL (Q3 = e), implémenté progressivement à partir de sprint 2

### 3.2 Backend

- **Nouveau service `ailiance-demo` FastAPI** (Q4 = b) — séparé du gateway ailiance, tourne sur studio `:9100`
- Le gateway ailiance garde sa responsabilité unique (router + inférence)
- Le cockpit agrège des sources hétérogènes : HF API, logs training, eval results, status workers — c'est exactement le rôle d'un BFF (Backend For Frontend)

### 3.3 Frontend

- **Frontend hébergé sur electron-server** (Linux), reverse proxy vers studio via Tailscale (Q5)
- **Stack identique à `life-web`** (Q6 = a) : Vite + React 19 + TypeScript + TanStack Router + TanStack Query + Tailwind + recharts + lucide-react + vitest
- **Deux apps Vite séparées** (approche B) :
  - `cockpit-public` (vitrine + chat) — bundle public, déployé Internet
  - `cockpit-admin` (tout l'admin) — Tailscale-only, isolé du bundle public
  - Package partagé `@cockpit/shared` (types, primitives UI, hooks API, design tokens)
- **UI** : Radix primitives + Tailwind, copiés dans `@cockpit/shared/ui/primitives/` (pattern shadcn/ui), pas d'import du package `@ailiance/ui` interne

### 3.4 Modèles exposés (vitrine)

- **Auto-listing depuis HF API + filtres + section Featured** (Q7 = d)
- Auto-sync toutes les 10 min, fallback cache disque
- `featured.yaml` commité dans le repo pour la curation manuelle (rang, headline, deprecation)

### 3.5 Temps réel

- **SSE pour streaming + REST polling pour status** (Q8 = b)
- SSE : chat tokens, training logs tail
- REST polling 5s : workers status (rare changement, TanStack Query suffit)

### 3.6 Auth

- Public : aucune auth, CORS `*`, rate-limit 30 req/min/IP via `slowapi` sur `POST /chat`
- Admin : header `X-Tailscale-User` injecté par nginx (electron-server) qui valide Tailscale en amont. FastAPI `Depends(require_tailscale_user)` vérifie présence + non-vide. Studio `:9100` firewallé pour n'accepter que depuis l'IP Tailscale d'electron-server (impossible à spoofer depuis Internet).

### 3.7 Persistence

- **Aucune DB pour sprints 0-2** — tout est dérivé du filesystem + HF API + cache mémoire
- SQLite arrivera en sprint 3 (eval orchestrator → job queue → writes)
- Caches : HF metadata (TTL 10/60 min en mémoire + JSON disque fallback), eval index (file-watched), featured.yaml (file-watched)

---

## 4. Layout du projet

Nouveau repo `ailiance/ailiance-demo` (monorepo) :

```
ailiance-demo/
├── apps/
│   ├── cockpit-public/         # Vite — vitrine + chat playground (sprint 1)
│   ├── cockpit-admin/          # Vite — admin (sprint 2, créé seulement à sprint 2)
│   └── api/                    # FastAPI service "ailiance-demo" (studio:9100)
├── packages/
│   └── shared/                 # @cockpit/shared : types + UI primitives + API client
├── pnpm-workspace.yaml
├── pyproject.toml              # uv project pour apps/api/
├── package.json                # racine pnpm
├── biome.json                  # lint+format unifié
├── docs/
│   ├── superpowers/specs/      # specs design
│   └── plans/                  # plans d'impl (writing-plans skill)
└── README.md
```

**Tooling** :
- pnpm workspace (JS/TS)
- uv project (Python, conforme à ailiance/ailiance-mac-tuner)
- biome (lint + format unique, ~10× plus rapide qu'eslint+prettier)
- vitest + @testing-library/react (front)
- pytest + httpx.AsyncClient (back)

---

## 5. Backend — `apps/api/` (ailiance-demo FastAPI)

### 5.1 Structure modules

```
apps/api/src/ailiance_demo/
├── main.py                       # FastAPI app, monte routers, CORS, middleware
├── config.py                     # paths : ~/ailiance-mac-tuner, ~/ailiance, etc.
├── deps.py                       # FastAPI Depends — auth, file watchers
├── routers/
│   ├── public/
│   │   ├── models.py             # GET /api/public/models, /api/public/models/{owner}/{name}
│   │   ├── chat.py               # POST /api/public/chat (SSE)
│   │   └── eval.py               # GET /api/public/eval/{model_id}
│   └── admin/                    # créé en sprint 2
│       ├── training.py           # GET /api/admin/training/runs, SSE logs
│       ├── workers.py            # GET /api/admin/workers/status
│       └── eval_browser.py       # GET /api/admin/eval/results
├── services/
│   ├── hf_sync.py                # HF API client + cache TTL 10 min
│   ├── featured.py               # parse featured.yaml (file-watched)
│   ├── eval_index.py             # walk ailiance/eval/results/, parse JSON
│   ├── training_runs.py          # découvre logs studio + GrosMac
│   ├── log_tail.py               # tail -F + parse mlx_lm (réutilise training_tui.py)
│   ├── workers.py                # ping :9200/:9301/:9302/:9303
│   └── chat_proxy.py             # forward bidirectionnel vers gateway :9200
├── models/                       # Pydantic schemas (génèrent OpenAPI → @cockpit/shared)
└── auth/
    └── tailscale.py              # vérifie header X-Tailscale-User (sprint 2)
```

### 5.2 Endpoints — sprint 0+1 (public)

| Méthode | Path | Réponse |
|---|---|---|
| GET | `/api/public/models` | `ModelCard[]` — auto-sync HF + featured, paginé/filtrable |
| GET | `/api/public/models/{owner}/{name}` | `ModelDetail` — provenance, datasets, scores, liens |
| GET | `/api/public/eval/{owner}/{name}` | `EvalSummary` — scores agrégés par benchmark |
| POST | `/api/public/chat` | **SSE** `text/event-stream` — proxy stream tokens depuis ailiance |
| GET | `/api/public/healthz` | liveness |

### 5.3 Endpoints — sprint 2 (admin)

| Méthode | Path | Réponse |
|---|---|---|
| GET | `/api/admin/training/runs` | `TrainingRun[]` — actifs + 50 derniers |
| GET | `/api/admin/training/runs/{id}` | détail config + métriques historisées |
| GET | `/api/admin/training/runs/{id}/logs` | **SSE** tail logs |
| GET | `/api/admin/workers/status` | health 4 workers + gateway ailiance |
| GET | `/api/admin/eval/results` | listing eval results (toutes machines) |
| GET | `/api/admin/healthz` | liveness |

### 5.4 Sources de données (lecture seule sprints 0-2)

| Source | Quoi | Fraicheur |
|---|---|---|
| HF API (`huggingface.co/api/...`) | model metadata, downloads, last-modified | TTL 10 min en mémoire + fallback JSON |
| `~/ailiance-demo/featured.yaml` | curation manuelle | watchdog instant |
| `~/ailiance/eval/results/**/*.json` | scores benchmarks | watchdog instant |
| `~/ailiance-mac-tuner/results/**/*.json` | scores benchmarks (legacy path) | watchdog instant |
| `~/ailiance-mac-tuner/logs/*.log` | training logs mlx_lm | tail -F sur demande |
| `~/ailiance/output/eval/**/*` | eval data (legacy) | au boot + watchdog |
| ailiance gateway `http://localhost:9200` | inférence chat + status workers | live |
| `~/ailiance/output/router/router.safetensors` | métadonnées routeur | au boot |

### 5.5 Schéma `EvalResult` (cible)

```python
class EvalResult(BaseModel):
    model_id: str              # "clemsail/micro-kiki-v3"
    adapter_id: str | None     # adapter LoRA si distinct
    benchmark: str             # "HumanEval+", "GSM8K", "MT-Bench"...
    metric: str                # "pass@1", "accuracy", "judge_score"
    score: float
    timestamp: datetime
    run_sha: str               # commit SHA d'eval
    hardware: str              # "M3 Ultra 512G"
    config: dict               # hyperparams, prompt template, seed
```

L'implémentation s'alignera sur le format réel d'`ailiance/eval/runners/result_writer.py` (à lire en début de sprint 0). Le schéma ci-dessus est la cible.

### 5.6 Format `featured.yaml`

```yaml
featured:
  - id: clemsail/micro-kiki-v3
    rank: 1
    headline: "242 dl, 4♥ — la variante Ailiance la plus adoptée"
  - id: clemsail/kiki-kicad-sft
    rank: 2
    headline: "Premier LLM open KiCad-fluent — 94 dl"

deprecated:
  - id: electron-rare/kiki-stm32-sft-v1
    superseded_by: clemsail/kiki-stm32-sft
    note: "v1 vide, utiliser clemsail/* à la place"

aliases:
  clemsail/micro-kiki-v3: "Micro-Ailiance v3"
```

---

## 6. Frontend — `apps/cockpit-public/` (sprint 1)

### 6.1 Structure

```
src/
├── routes/                       # @tanstack/router-plugin (file-based)
│   ├── __root.tsx                # layout : Header + Footer
│   ├── index.tsx                 # /        — Featured 5-8 modèles + intro projet
│   ├── models/
│   │   ├── index.tsx             # /models  — grille complète + filtres
│   │   └── $owner/$name.tsx      # /models/clemsail/micro-kiki-v3 — détail
│   ├── chat/$owner/$name.tsx     # /chat/clemsail/micro-kiki-v3 — playground SSE
│   └── about.tsx                 # /about   — EU AI Act methodology, transparence
├── components/
│   ├── ModelCard.tsx
│   ├── ModelDetail/{Provenance,EvalScores,DatasetList}.tsx
│   ├── ChatPlayground/{ChatPlayground,MessageBubble,PromptInput,ParamsPanel}.tsx
│   ├── filters/{DomainFilter,BaseModelFilter,StatusFilter}.tsx
│   └── layout/{Header,Footer}.tsx
├── hooks/
│   ├── useModels.ts              # TanStack Query
│   ├── useModelDetail.ts
│   ├── useChatStream.ts          # SSE consumption avec eventsource-parser
│   └── useEvalScores.ts
└── lib/sse.ts                    # wrapper EventSource + parser
```

### 6.2 UX — détail page modèle

- En-tête : nom + badges (domaine, base model, statut featured/production/alpha/experimental)
- Métrique-phare : top eval score si dispo (ex. "HumanEval+: 78.4 %"), sinon "242 dl"
- Sections :
  1. **Provenance** : base model, méthode (LoRA / SFT / DPO), training config (seq, lr, batch, iters), hardware, timestamp
  2. **Datasets** : liste avec licence, count examples, lien HF
  3. **Eval scores** : tableau complet par benchmark (Lighteval, EvalPlus, MT-Bench, KIKI-native)
  4. **Liens** : HuggingFace, GitHub source, commits training
- CTA principal : bouton **"Try it"** → `/chat/{owner}/{name}`

### 6.3 UX — chat playground

- Bulles type Claude/ChatGPT, markdown progressif au stream
- Code blocks avec syntax highlighting (shiki, HTML statique)
- Panneau params collapsable : T° (slider), max_tokens, system prompt
- Bouton **Stop** mid-stream (AbortController)
- Historique de session **non persisté** (refresh = reset). La persistence locale (localStorage) est sprint 6.

**Stratégie 2 catégories de modèles** (sprint 1) :

| Catégorie | Modèles | Bouton "Try it" |
|---|---|---|
| **AILIANCE Live Stack** (3) | Apertus 70B, Devstral 24B, EuroLLM 22B (servis sur ailiance gateway `:9200`, Jina auto-routing vers les 32 adapters EU) | ✅ Chat local SSE via cockpit |
| **HF Published** (24) | `clemsail/*` + `electron-rare/*` (Qwen / Mistral Large / Brainstacks adapters non servis localement en sprint 1) | 🔗 "Try on HuggingFace" → deep-link vers `huggingface.co/{owner}/{name}` (HF Inference embed gratuit) |

Le serving local des `clemsail/*` arrive en sprint 6 (load adapter dynamique sur worker MLX).

### 6.3.1 Mapping `model_id` → endpoint inférence

Le `model_id` est l'ID HF canonique (`{owner}/{name}`). Pour les AILIANCE Live, on utilise un alias :

| Card affichée | `model_id` API | Backend |
|---|---|---|
| Apertus 70B (AILIANCE) | `ailiance/apertus-70b` | gateway `:9200` → worker `:9301` |
| Devstral 24B (AILIANCE) | `ailiance/devstral-24b` | gateway `:9200` → worker `:9302` |
| EuroLLM 22B (AILIANCE) | `ailiance/eurollm-22b` | gateway `:9200` → worker `:9303` |
| Micro-Ailiance v3 | `clemsail/micro-kiki-v3` | HF deep-link (sprint 1) |
| ... 23 autres HF | `{owner}/{name}` | HF deep-link (sprint 1) |

### 6.4 UX — galerie + filtres

- Grille responsive (4 cols desktop, 1 col mobile)
- 3 facettes : domaine (KiCad, STM32, ML, etc.), base model (Mistral Large, Qwen 35B, etc.), statut (featured / production / alpha / deprecated)
- Searchbox texte (nom, description)
- URL-stateful (`?domain=stm32&base=mistral-large`) pour partage/bookmark
- Section "Featured" en haut de page d'accueil, ordre piloté par `featured.yaml`

---

## 7. Frontend — `apps/cockpit-admin/` (sprint 2)

### 7.1 Structure

```
src/
├── routes/
│   ├── index.tsx                 # /          — dashboard 4 widgets
│   ├── training/
│   │   ├── index.tsx             # /training  — liste runs (actifs + 50 derniers)
│   │   └── $id.tsx               # /training/:id — config + LossChart + LogTail SSE
│   ├── workers/index.tsx         # /workers   — status grid 4 workers
│   └── eval/index.tsx            # /eval      — browser eval/results/
├── components/
│   ├── TrainingRunCard.tsx
│   ├── LossChart.tsx             # recharts : X=iter, Y=loss train+val, ETA annotation
│   ├── LogTail.tsx               # liste virtualisée + autoscroll + filtre regex + copy
│   └── WorkerStatusGrid.tsx
└── hooks/
    ├── useTrainingRuns.ts
    ├── useTrainingLogs.ts        # SSE log tail
    └── useWorkersStatus.ts
```

### 7.2 UX — dashboard overview

- 4 widgets en grille :
  1. **Trainings actifs** (count + dernier run nommé + loss courante)
  2. **Workers status** (4 cartes mini, vert/rouge/jaune)
  3. **Dernière éval** (modèle + benchmark + score + timestamp)
  4. **Alertes** (workers down, OOM detected dans logs, etc.)

### 7.3 UX — détail run

- **LossChart** à gauche (recharts) : courbes train+val, X=iter, annotation ETA
- **Config training** à droite : modèle, dataset, hyperparams, hardware, machine
- **LogTail** en bas (virtualisée — `react-virtuoso` ou équivalent) : ~10K lignes affichables sans lag, autoscroll par défaut, filtre regex, bouton copy

### 7.4 UX — workers grid

- Carte par worker : Apertus / Devstral / EuroLLM / Gateway
- Couleur selon health (vert OK, jaune warn, rouge down)
- Métriques : latence p50/p99, mem usage, dernière requête timestamp

---

## 8. Package partagé — `packages/shared/` (`@cockpit/shared`)

```
src/
├── api/
│   ├── client.ts                 # fetch wrapper (baseUrl, error handling, abort)
│   ├── types.ts                  # AUTO-GÉNÉRÉ — pnpm gen:api-types depuis OpenAPI
│   └── sse.ts                    # SSE client primitive (eventsource-parser)
├── ui/primitives/                # Button, Card, Input, Badge, Dialog, etc.
├── ui/design-tokens.ts           # palette EU/Suisse + tailwind preset
├── ui/markdown.tsx               # markdown + shiki syntax highlighting
├── hooks/
│   ├── useDebounce.ts
│   ├── useEventSource.ts
│   └── useAbortController.ts
└── utils/
    ├── format.ts                 # downloads, dates, sizes
    └── parse.ts                  # HF model ID, version strings
```

**Génération types** : `pnpm gen:api-types` invoque `openapi-typescript` sur `http://localhost:9100/openapi.json` → `packages/shared/src/api/types.ts`. Garantit zéro drift front/back.

---

## 9. Data flows

### 9.1 HF auto-sync

```
HF API ──(every 10min, background task)──→ hf_sync.py
                                                ↓
                                          cache mémoire (TTL 60min)
                                                ↓
~/.cache/ailiance-demo/hf-models.json ←──── snapshot disque (cold-start fallback)
                                                ↑
featured.yaml ──(watchdog)──→ merge featured flag + headline + ordre
                                                ↓
                                       /api/public/models
```

### 9.2 Indexation eval results

- Walk `~/ailiance/eval/results/**/*.json` + `~/ailiance-mac-tuner/results/**/*.json` au boot
- Parse → `EvalResult` Pydantic
- Index en mémoire : `model_id → [EvalResult, ...]`
- Watchdog incrémental (file-add/modify) reload juste les nouveaux
- Agrégats latest-score-par-benchmark exposés via `/api/public/eval/{model}`

### 9.3 Training log tail (sprint 2)

Réutilise les regex de `ailiance-mac-tuner/scripts/training_tui.py` :

```python
re.match(r'Iter (\d+): Val loss ([\d.]+), Val took ([\d.]+)s', line)
re.match(r'Iter (\d+): Train loss ([\d.]+), Learning Rate ...', line)
```

Flux SSE :

```
GET /api/admin/training/runs/{id}/logs   (SSE)
        ↓
log_tail.py : tail -F + parse line-by-line
        ↓
events :
  {"type":"iter","iter":420,"split":"val","loss":0.479,"took_s":12.3}
  {"type":"iter","iter":421,"split":"train","loss":0.51,"lr":3e-5}
  {"type":"raw","line":"some misc output"}
        ↓
Browser : useEventSource → reducer → LossChart + LogTail
```

Découverte runs actifs : process listing + mtime sur `*.log` < 5 min.

### 9.4 Chat streaming proxy

```
Browser POST /api/public/chat  {model_id, messages, params}
        ↓
chat_proxy.py routing :
  - model_id ∈ {ailiance/apertus-70b, ailiance/devstral-24b, ailiance/eurollm-22b}
      →  forward ailiance gateway :9200 (avec routing Jina activé)
  - sinon (clemsail/* ou electron-rare/* HF-only)
      →  HTTP 501 Not Implemented + payload {"hf_url": "https://huggingface.co/{owner}/{name}"}
         (le frontend redirige avant même d'appeler ; cet endpoint sert de garde)
        ↓
ailiance gateway :9200 → MLX worker → tokens stream
        ↓
chat_proxy.py relays SSE chunks 1:1
        ↓
Browser EventSource → useChatStream → bulles markdown progressif
```

**Cancel mid-stream** : `AbortController` browser → `Connection: close` → cockpit close gateway connection → MLX worker stop à la prochaine itération.

**Note** : le frontend connaît la liste des modèles chat-eligibles (les 3 `ailiance/*` aliases) via l'endpoint `GET /api/public/models` qui inclut un flag `chat_eligible: bool` par modèle. Le bouton "Try it" du frontend est conditionnel sur ce flag — il devient un lien externe HF si `false`. L'endpoint `/api/public/chat` ne devrait jamais être appelé pour un modèle non-éligible, mais retourne 501 par défense en profondeur.

### 9.5 Workers status (sprint 2)

```
toutes les 5s :
  cockpit ping :9200/health, :9301/health, :9302/health, :9303/health
  (parallèle, timeout 1s)
        ↓
  agrège : {worker, status, latency_ms, last_req_ts, mem_mb}
        ↓
  GET /api/admin/workers/status (REST polling 5s côté admin)
```

---

## 10. Auth & access control

| Surface | Auth | Source de vérité |
|---|---|---|
| `/api/public/*` | aucune | CORS `*`, rate-limit 30 req/min/IP via `slowapi` sur `POST /chat` |
| `/api/admin/*` | header `X-Tailscale-User` non vide | injecté par nginx d'electron-server qui valide Tailscale en amont |
| Studio `:9100` | firewall macOS | `pfctl` n'accepte que depuis l'IP Tailscale d'electron-server (à régler en deploy) |
| Admin frontend (par ex. `admin.ailiance.fr`) | nginx Tailscale-only (Funnel désactivé) | un visiteur Internet ne résout même pas le DNS |

Sprint 2 : un seul `Depends(require_tailscale_user)` sur le router admin. Pas de rôles — quiconque est dans le tailnet = admin. Si invité ponctuel un jour, le tailnet ACL gère, pas le code.

---

## 11. Error handling

### Backend

- Pydantic validation → 422 avec payload structuré
- Exceptions externes (HF API, gateway :9200) wrappées en `UpstreamError` → 502 avec `cause`
- Erreurs FS sur eval results : log + skip ce fichier, pas de cassure du listing
- SSE error mid-stream : emit `{"type":"error","message":"..."}` puis close
- Background HF sync fail : log + retry exponential, sert le dernier cache JSON disque

### Frontend

- TanStack Query : `retry: 2`, exponential, `onError` → toast non-bloquant
- SSE : reconnect exponential via `eventsource-parser`, indicateur "Reconnexion…" après 5 s
- ErrorBoundary à la racine, fallback UI "Quelque chose a planté — recharger ?" + bouton + lien GitHub issues
- Empty states explicites pour chaque liste ("Aucun modèle ne correspond à ces filtres")
- Skeleton components au chargement (pas spinners)
- Cancel chat : AbortController → UI affiche "Arrêté" sur le dernier message

---

## 12. Testing

| Couche | Stack | Cible coverage |
|---|---|---|
| Backend unit | pytest + hypothesis pour `eval_index/hf_sync/log_tail` (fixtures = HF API mocks + sample JSONs) | 80%+ services/ |
| Backend integration | `httpx.AsyncClient` + FastAPI TestClient + WireMock pour HF + mock gateway :9200 | 100% routers (thin) |
| Frontend component | vitest + @testing-library/react (ModelCard, ChatPlayground, LogTail) | 70%+ |
| Frontend hooks | vitest avec mock SSE source + mock QueryClient | 80%+ |
| E2E (optionnel sprint 2+) | Playwright contre cockpit local + gateway mocké : 2 golden paths | — |

**TDD** : écrire les tests d'endpoint AVANT le router (la fixture HF + le schéma Pydantic suffisent à dériver le test). Pour le frontend, snapshot + interaction tests sur ModelCard et ChatPlayground (les 2 composants critiques sprint 1).

---

## 13. Observability

- Backend : `structlog` JSON formatter, chaque requête loggée avec `trace_id, route, status, duration_ms, x_tailscale_user`
- Background tasks (HF sync) : logs avec task name + outcome
- Pas de Prometheus/Sentry pour sprints 0-2 — ajout simple si besoin (sprint 3+)
- Healthchecks dédiés : `/api/public/healthz` (testable depuis Internet) et `/api/admin/healthz` (testable depuis Tailnet)

---

## 14. Critères d'acceptation

### Sprint 0 — Foundation
- [ ] Repo `ailiance-demo/` initialisé avec layout monorepo (apps/, packages/, configs)
- [ ] `apps/api/` : FastAPI minimal qui boote, expose `/api/public/healthz` et OpenAPI
- [ ] `pnpm gen:api-types` produit `packages/shared/src/api/types.ts` à partir d'OpenAPI
- [ ] CI : lint + typecheck + test passent sur PR
- [ ] Pas de fonctionnalité métier — uniquement le squelette

### Sprint 1 — Vitrine + Playground
- [ ] `apps/cockpit-public/` boote avec routes /, /models, /models/$owner/$name, /chat/$owner/$name, /about
- [ ] HF auto-sync fonctionnel : 24 modèles `clemsail/*` + `electron-rare/*` listés avec metadata
- [ ] `featured.yaml` curé, vitrine montre les featured en homepage
- [ ] Filtres galerie opérationnels (domaine + base + statut + recherche), URL-stateful
- [ ] Page détail modèle : provenance + datasets + eval scores + liens HF/GitHub
- [ ] Chat playground fonctionnel pour les 3 modèles AILIANCE Live (`ailiance/apertus-70b`, `ailiance/devstral-24b`, `ailiance/eurollm-22b`) — proxy SSE → ailiance gateway `:9200`
- [ ] Pour les 24 modèles HF non servis localement : bouton "Try on HuggingFace" qui deep-link vers `huggingface.co/{owner}/{name}`
- [ ] Endpoint `GET /api/public/models` expose un flag `chat_eligible` par modèle
- [ ] Cancel mid-stream fonctionnel sur les modèles chat-eligibles
- [ ] Tests : ModelCard + ChatPlayground + useChatStream + tous les endpoints public

### Sprint 2 — Monitoring read-only
- [ ] `apps/cockpit-admin/` boote avec routes /, /training, /training/$id, /workers, /eval
- [ ] Auth Tailscale opérationnelle (Depends + nginx config documentée)
- [ ] Découverte runs actifs depuis logs (studio + GrosMac)
- [ ] LossChart en live pendant un training (SSE)
- [ ] LogTail virtualisée 10K lignes sans lag
- [ ] Workers status grid à jour 5s
- [ ] Eval results browser fonctionnel
- [ ] Tests : LossChart + LogTail + useTrainingLogs + tous les endpoints admin

---

## 15. Hors scope explicite (sprints 3-6)

- **Lancer trainings** depuis l'UI (sprint 4) → introduit job queue + auth de spawn
- **Publier sur HF** depuis l'UI (sprint 5) → introduit secrets HF tokens
- **REPL debug 2-modèles** côte-à-côte (sprint 6) → réutilise ChatPlayground en double
- **Eval orchestrator on-demand** (sprint 3) → introduit job queue + tracking
- **Persistence (SQLite)** → arrive en sprint 3 quand on a des writes à tracker
- **Charger des adapters HF dynamiquement** dans le worker MLX (pour le chat des `clemsail/*`) → sprint 6
- **Déploiement** (Docker, systemd unit, nginx config, DNS, TLS, Cloudflare Tunnel) → tracé séparément, après dev

---

## 16. Risques connus

| Risque | Sévérité | Mitigation |
|---|---|---|
| Le format réel d'`eval/runners/result_writer.py` diffère du schéma cible `EvalResult` | Moyen | Lire le code en début de sprint 0, ajuster Pydantic avant d'écrire le service |
| HF API rate limits (1000 req/h sans token) | Faible | Cache 10 min suffit largement pour 24 modèles ; ajouter HF token côté backend si besoin |
| Logs `mlx_lm` ont changé de format depuis `training_tui.py` | Moyen | Vérifier sur un log récent en début de sprint 2, ajouter regex au besoin |
| Studio peut être down (maintenance, reboot) → public chat KO | Faible | Endpoint `/healthz` + status badge dans UI ; éventuellement mode dégradé "showroom only" |
| nginx Tailscale-User header spoofable si firewall mal configuré | Critique | Documenter `pfctl` rule explicite + test d'intégration qui vérifie le rejet sans header |
| Bundle public charge accidentellement du code admin (mauvais split monorepo) | Moyen | CI vérifie taille bundle public + pas d'imports cross-app |

---

## 17. Décisions différées

- Domaine public exact (`ailiance.fr` ? autre ?) → décision deploy
- Mécanique exacte d'injection `X-Tailscale-User` (Tailscale Funnel module nginx, ou auth_request, ou Tailscale Serve) → décision deploy
- Mécanique reverse proxy electron-server → studio (Tailscale natif vs nginx upstream) → décision deploy
- DNS split (admin sous `admin.*` vs path `/admin/*`) → décision deploy

---

**Suivant** : invoquer la skill `writing-plans` pour produire le plan d'implémentation des sprints 0+1+2.
