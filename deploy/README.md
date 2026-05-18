# Deploying ailiance-demo

Two artefacts:

| Service | Host | Port | Why this host |
|---|---|---|---|
| `ailiance-demo-{api,public,admin}` | `electron-server` | 443 (Traefik) | co-located with the ailiance gateway `:9300`, public IP, Traefik already there |
| `ailiance-collector` | `studio` (Mac M3 Ultra) | 9150 | reads training logs and eval results that live in the user's home dir on studio |

The cockpit API on electron-server polls the collector on studio over Tailscale.
This mirrors the ailiance worker pattern: each machine exposes its data over HTTP, no NFS / SSHFS.

---

## DNS

| Record | Type | Mode | Target |
|---|---|---|---|
| `ailiance.fr` | CNAME | proxied (orange) | `<TUNNEL_ID>.cfargotunnel.com` |
| `www.ailiance.fr` | CNAME | proxied (orange) | `<TUNNEL_ID>.cfargotunnel.com` |
| `admin.ailiance.fr` | A | DNS-only (grey) | electron-server Tailscale IP (`100.78.191.52`) |

The public host goes through Cloudflare Tunnel (`cloudflared` already running on
electron-server, serving every other `*.saillant.cc` subdomain). The tunnel's
ingress must include rules for `ailiance.fr` and `www.ailiance.fr` → `https://localhost:443`
(noTLSVerify: true) — managed in the Cloudflare Zero Trust dashboard or via API.

The grey-cloud admin record makes the admin host reachable **only from the tailnet**:
non-members can resolve it but can't route to a `100.64/10` IP. No Traefik IPAllowList
needed. Cloudflare can't proxy a Tailscale-only origin (no public IP), so leaving it
DNS-only is both correct and necessary. Traefik issues its Let's Encrypt cert via
ACME DNS-01 (Cloudflare provider) — works without any inbound public route.

---

## Cockpit on electron-server

Prerequisites on the host:
- Docker + compose
- External Docker network `traefik` (already there — Traefik 3 is up on `:80`/`:443`)
- Cert resolver `letsencrypt` (or override `TRAEFIK_CERTRESOLVER` in `.env`)

```bash
ssh electron-server
sudo mkdir -p /opt/ailiance-demo && sudo chown $USER:$USER /opt/ailiance-demo
cd /opt/ailiance-demo
gh repo clone ailiance/ailiance-demo .
cp deploy/.env.example deploy/.env                    # then edit
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

All Traefik routers (public, admin, preview, api) are defined via the
compose `labels` and picked up by Traefik's docker provider — no extra
dynamic file to install.

Verify:
```bash
curl -I https://ailiance.fr                        # 200 from public vitrine
curl -I https://ailiance.fr/api/public/healthz     # 200 from API
curl -I https://admin.ailiance.fr                  # 200 (only from tailnet)
```

The API container reaches the host's `:9300` gateway via `host.docker.internal`
(Docker provides the `host-gateway` mapping in `extra_hosts`). Tailscale Magic DNS
names (`studio`, `macm1`, `tower`) resolve through the host's resolver.

---

## Collector on studio

The shipped plist is a **LaunchDaemon** — works on headless Macs (no GUI
session) and bootstraps over SSH with sudo.

⚠️ **macOS TCC**: the collector must live **outside `~/Documents`**. Modern
macOS blocks daemons from user data directories even when running as that
user — the daemon stays in `spawn scheduled` state with `last exit code = 1`
and no log file is ever written. We install the code to `/opt/ailiance-collector/`.

Step 1 — clone + install deps under HOME (still useful as a working tree):
```bash
ssh studio
cd ~/Documents/Projets
git clone https://github.com/ailiance/ailiance-demo.git    # or rsync from another host
cd ailiance-demo/deploy/collector
~/.local/bin/uv sync                                              # creates .venv
```

Step 2 — relocate to `/opt/ailiance-collector/` and bootstrap (one sudo prompt):
```bash
sudo mkdir -p /opt/ailiance-collector
sudo chown clems:staff /opt/ailiance-collector
# IMPORTANT: exclude .venv — virtualenvs bake the project root into pyvenv.cfg,
# so a venv created in ~/Documents stays bound to ~/Documents (TCC-blocked).
rsync -az --exclude='.venv' ~/Documents/Projets/ailiance-demo/deploy/collector/ /opt/ailiance-collector/
cd /opt/ailiance-collector && ~/.local/bin/uv sync       # fresh venv at /opt/ailiance-collector/.venv

sudo cp /opt/ailiance-collector/cc.ailiance.collector.plist /Library/LaunchDaemons/
sudo chown root:wheel /Library/LaunchDaemons/cc.ailiance.collector.plist
sudo chmod 644       /Library/LaunchDaemons/cc.ailiance.collector.plist
sudo launchctl bootout   system/cc.ailiance.collector 2>/dev/null
sudo launchctl bootstrap system /Library/LaunchDaemons/cc.ailiance.collector.plist

curl http://localhost:9150/healthz       # → {"status":"ok","machine":"studio"}
```

The daemon runs as user `clems` (set via `UserName` in the plist) so HOME-owned
paths stay readable. Logs go to `~/Library/Logs/ailiance-collector.log`
(daemon-writable; `/var/log/` is not writable for non-root daemons).

Until step 2 is done, you can run the collector transiently over SSH:
```bash
ssh studio "cd ~/Documents/Projets/ailiance-demo/deploy/collector && \
  nohup ~/.local/bin/uv run uvicorn ailiance_collector.main:app \
    --host 0.0.0.0 --port 9150 > ~/Library/Logs/ailiance-collector.log 2>&1 &"
```

From electron-server (over Tailscale):
```bash
curl http://studio:9150/api/v1/training/runs           # → JSON list
```

Override roots if needed:
```bash
launchctl setenv COLLECTOR_TRAINING_LOG_ROOTS '["/Users/clems/Documents/Projets/ailiance-mac-tuner/logs"]'
```

Container variant (`Dockerfile`) exists for hosts where launchd is not available
(Linux training boxes). Mount the log dirs read-only and expose `:9150`.

---

## Topology recap

```
            Internet
               │  Cloudflare (proxied)
               ▼
   ailiance.fr:443  ─────────────────────┐
                                            │
   admin.ailiance.fr:443  (DNS-only) ──┐ │
                                          │ │
                                          ▼ ▼
                              electron-server:443
                                  ┌─── Traefik 3 ───┐
                                  │                  │
                  ┌───────────────┼──────┬───────────┤
                  ▼               ▼      ▼           ▼
                public          admin   /api      ailiance
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
                                          ailiance-collector
                                          (logs + eval JSON)
```

The cockpit API uses agent-kiki's exact OpenAI-compatible pattern when proxying chat
(see `cli/src/utils/ailiance-default.ts` in agent-kiki) — single endpoint, sentinel API
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
