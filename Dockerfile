# syntax=docker/dockerfile:1.7
# Multi-target image: api (FastAPI), public (Vite SPA), admin (Vite SPA).
# Build a specific service with: docker build --target=<api|public|admin> .

# --- Node build base (shared by both SPAs) ----------------------------------
FROM node:20-alpine AS node-base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml biome.json ./
COPY packages ./packages
COPY apps/cockpit-public/package.json ./apps/cockpit-public/
COPY apps/cockpit-admin/package.json ./apps/cockpit-admin/
RUN pnpm install --frozen-lockfile

# --- cockpit-public build ---------------------------------------------------
FROM node-base AS public-build
COPY apps/cockpit-public ./apps/cockpit-public
COPY apps/cockpit-admin ./apps/cockpit-admin
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter cockpit-public build

# --- cockpit-public runtime -------------------------------------------------
FROM nginx:1.27-alpine AS public
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=public-build /repo/apps/cockpit-public/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1

# --- cockpit-admin build ----------------------------------------------------
FROM node-base AS admin-build
COPY apps/cockpit-public ./apps/cockpit-public
COPY apps/cockpit-admin ./apps/cockpit-admin
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter cockpit-admin build

# --- cockpit-admin runtime --------------------------------------------------
FROM nginx:1.27-alpine AS admin
COPY deploy/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /repo/apps/cockpit-admin/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1

# --- api: FastAPI service ---------------------------------------------------
FROM python:3.12-slim AS api
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_PYTHON_DOWNLOADS=never
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app

# uv workspace: copy root + member that we want, then sync only that package
COPY pyproject.toml uv.lock ./
COPY apps/api ./apps/api
RUN uv sync --frozen --no-dev --package kiki-cockpit-api

# Bring runtime config that the api reads at startup
COPY featured.yaml ./featured.yaml

ENV PATH="/app/.venv/bin:${PATH}" \
    COCKPIT_HOST=0.0.0.0 \
    COCKPIT_PORT=9100 \
    COCKPIT_FEATURED_PATH=/app/featured.yaml
EXPOSE 9100
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD curl -fsS http://127.0.0.1:9100/api/public/healthz || exit 1
CMD ["uvicorn", "kiki_cockpit.main:app", "--host", "0.0.0.0", "--port", "9100", "--proxy-headers", "--forwarded-allow-ips", "*"]
