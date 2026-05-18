# syntax=docker/dockerfile:1.7
# Multi-target image: api (FastAPI), public (Vite SPA), admin (Vite SPA).
# Build a specific service with: docker build --target=<api|public|admin> .

# --- Node build base (shared by both SPAs) ----------------------------------
FROM node:20-bookworm-slim AS node-base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml biome.json ./
COPY packages ./packages
COPY apps/cockpit-public/package.json ./apps/cockpit-public/
COPY apps/cockpit-admin/package.json ./apps/cockpit-admin/
RUN pnpm install --frozen-lockfile

# --- Generate packages/shared/src/api/types.ts from FastAPI OpenAPI ---------
# scripts/gen-api-types.sh boots the API briefly and runs openapi-typescript.
# Both Python and Node are needed in this stage.
FROM node-base AS gen-types
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy UV_COMPILE_BYTECODE=0 UV_PYTHON_DOWNLOADS=automatic
COPY pyproject.toml uv.lock ./
COPY apps/api ./apps/api
COPY featured.yaml ./featured.yaml
COPY scripts ./scripts
RUN uv sync --frozen --no-dev --package ailiance-demo-api
ENV PATH="/repo/.venv/bin:${PATH}"
RUN bash scripts/gen-api-types.sh

# --- cockpit-public build ---------------------------------------------------
FROM node-base AS public-build
COPY apps/cockpit-public ./apps/cockpit-public
COPY apps/cockpit-admin ./apps/cockpit-admin
COPY --from=gen-types /repo/packages/shared/src/api/types.ts ./packages/shared/src/api/types.ts
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter cockpit-public build

# --- cockpit-public runtime (SSR Node server) ---
FROM node:20-bookworm-slim AS public
WORKDIR /app
COPY --from=public-build /repo/apps/cockpit-public/.output ./.output
ENV PORT=3000
EXPOSE 3000
# The SSR root render is slow on a cold container: its loaders fan out to
# the gateway, worker probes and the HF API before the in-process caches
# warm (~10s). A 3s timeout could never pass that first render, so the
# container stayed `starting` and Traefik 404'd the site for ~60-90s on
# every deploy. A generous timeout plus start-period/-interval lets the
# first check both pass and warm the caches — Traefik then routes a box
# that is already warm.
HEALTHCHECK --interval=30s --timeout=15s --start-period=45s --start-interval=3s \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]

# --- cockpit-admin build ----------------------------------------------------
FROM node-base AS admin-build
COPY apps/cockpit-public ./apps/cockpit-public
COPY apps/cockpit-admin ./apps/cockpit-admin
COPY --from=gen-types /repo/packages/shared/src/api/types.ts ./packages/shared/src/api/types.ts
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter cockpit-admin build

# --- cockpit-admin runtime --------------------------------------------------
FROM nginx:1.27-alpine AS admin
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /repo/apps/cockpit-admin/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

# --- api: FastAPI service ---------------------------------------------------
FROM python:3.12-slim AS api
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates openssh-client \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app

# uv workspace: copy root + member that we want, then sync only that package
COPY pyproject.toml uv.lock ./
COPY apps/api ./apps/api
RUN uv sync --frozen --no-dev --package ailiance-demo-api

# Bring runtime config that the api reads at startup
COPY featured.yaml ./featured.yaml
COPY apps/api/benchmarks.yaml ./apps/api/benchmarks.yaml

ENV PATH="/app/.venv/bin:${PATH}" \
    COCKPIT_HOST=0.0.0.0 \
    COCKPIT_PORT=9100 \
    COCKPIT_FEATURED_PATH=/app/featured.yaml
EXPOSE 9100
COPY apps/api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD curl -fsS http://127.0.0.1:9100/api/public/healthz || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "ailiance_demo.main:app", "--host", "0.0.0.0", "--port", "9100", "--proxy-headers", "--forwarded-allow-ips", "*"]
