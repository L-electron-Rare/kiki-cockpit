# Deploying kiki-cockpit

Two artefacts:

| Service | Host | Port | Why this host |
|---|---|---|---|
| `kiki-cockpit-{api,public,admin}` | `electron-server` | 443 (Traefik) | co-located with the eu-kiki gateway `:9300`, public IP, Traefik already there |
| `kiki-collector` | `studio` (Mac M3 Ultra) | 9150 | reads training logs and eval results that live in the user's home dir on studio |

The cockpit API on electron-server polls the collector on studio over Tailscale.
This mirrors the eu-kiki worker pattern: each machine exposes its data over HTTP, no NFS / SSHFS.

---

## DNS

| Record | Mode | Target |
|---|---|---|
| `ml.saillant.cc` | Cloudflare proxied (orange) | electron-server public IP |
| `admin.ml.saillant.cc` | Cloudflare DNS-only (grey) | electron-server **Tailscale** IP `100.78.191.52` |

The grey-cloud admin record makes the admin host reachable **only from the tailnet**:
non-members can resolve it but can't route to a `100.64/10` IP. No Traefik IPAllowList
needed. Cloudflare can't proxy a Tailscale-only origin (no public IP), so leaving it
DNS-only is both correct and necessary.

---

## Cockpit on electron-server

Prerequisites on the host:
- Docker + compose
- External Docker network `traefik` (already there — Traefik 3 is up on `:80`/`:443`)
- Cert resolver `letsencrypt` (or override `TRAEFIK_CERTRESOLVER` in `.env`)

```bash
ssh electron-server
mkdir -p /opt/kiki-cockpit && cd /opt/kiki-cockpit
git clone https://github.com/L-electron-Rare/kiki-cockpit.git .
git checkout deploy/electron-server      # until merged
cp deploy/.env.example deploy/.env       # then edit
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Verify:
```bash
curl -I https://ml.saillant.cc                        # 200 from public vitrine
curl -I https://ml.saillant.cc/api/public/healthz     # 200 from API
curl -I https://admin.ml.saillant.cc                  # 200 (only from tailnet)
```

The API container reaches the host's `:9300` gateway via `host.docker.internal`
(Docker provides the `host-gateway` mapping in `extra_hosts`). Tailscale Magic DNS
names (`studio`, `macm1`, `tower`) resolve through the host's resolver.

---

## Collector on studio

Native launchd (preferred — needs HOME read access to logs):

```bash
ssh studio
cd ~/Documents/Projets
git clone https://github.com/L-electron-Rare/kiki-cockpit.git
cd kiki-cockpit/deploy/collector
uv sync                                                 # installs deps in .venv
cp cc.kiki.collector.plist ~/Library/LaunchAgents/
# Open the plist and adjust paths if your checkout is elsewhere
launchctl load ~/Library/LaunchAgents/cc.kiki.collector.plist
launchctl start cc.kiki.collector
curl http://localhost:9150/healthz                      # → {"status":"ok","machine":"studio"}
```

From electron-server (over Tailscale):
```bash
curl http://studio:9150/api/v1/training/runs           # → JSON list
```

Override roots if needed:
```bash
launchctl setenv COLLECTOR_TRAINING_LOG_ROOTS '["/Users/clems/Documents/Projets/KIKI-Mac_tunner/logs"]'
```

Container variant (`Dockerfile`) exists for hosts where launchd is not available
(Linux training boxes). Mount the log dirs read-only and expose `:9150`.

---

## Topology recap

```
            Internet
               │  Cloudflare (proxied)
               ▼
   ml.saillant.cc:443  ─────────────────────┐
                                            │
   admin.ml.saillant.cc:443  (DNS-only) ──┐ │
                                          │ │
                                          ▼ ▼
                              electron-server:443
                                  ┌─── Traefik 3 ───┐
                                  │                  │
                  ┌───────────────┼──────┬───────────┤
                  ▼               ▼      ▼           ▼
                public          admin   /api      eu-kiki
              (nginx SPA)    (nginx SPA) (FastAPI)  gateway :9300
                                          │            │
                                          │            ▼
                                          │      LiteLLM router
                                          │            │
                                          │     ┌──────┼─────┬────────┐
                                          │     ▼      ▼     ▼        ▼
                                          │  studio  studio  macm1   tower
                                          │  :9301   :9303   :9302   :9304
                                          │  Apertus EuroLLM Devstral Gemma3
                                          │
                                          ▼
                            Tailscale ──► studio:9150
                                          kiki-collector
                                          (logs + eval JSON)
```

The cockpit API uses agent-kiki's exact OpenAI-compatible pattern when proxying chat
(see `cli/src/utils/eu-kiki-default.ts` in agent-kiki) — single endpoint, sentinel API
key, gateway handles routing to the right worker.

---

## Out of scope (next iterations)

- Wire the cockpit API's `services/{training_runs,log_tail,eval_index}.py` to the
  collector HTTP endpoints (replace `Path()` walks with `httpx.get(COCKPIT_COLLECTOR_BASE_URL + ...)`).
  The collector already returns the same JSON shape the local services produce.
- Cockpit-admin: surface `X-Tailscale-User` from Tailscale Serve (or replace the
  header check by an "if you reached this hostname you're in the tailnet" model
  matching the DNS gating used here).
- Image registry (currently builds locally on electron-server). Move to GHCR once
  the `deploy/electron-server` branch is merged.
