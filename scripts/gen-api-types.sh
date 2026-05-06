#!/usr/bin/env bash
# Generate TypeScript types from FastAPI's OpenAPI schema.
# Boots the API briefly, fetches /openapi.json, runs openapi-typescript.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/packages/shared/src/api/types.ts"

mkdir -p "$(dirname "$OUT")"

# Boot API in background. Use python -m uvicorn directly so we skip uv's
# resolver (already synced via `uv sync` in upstream Dockerfile stage); uv run
# can take 30+ s to re-resolve in restricted networks during Docker builds.
cd "$ROOT"
python -m uvicorn ailiance_demo.main:app --host 127.0.0.1 --port 9199 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

# Wait for it to be up. Lifespan does HF API fetches (~10s on macOS, up to
# 60s on Docker builds with slower networks); add headroom.
for i in {1..180}; do
  if curl -fsS http://127.0.0.1:9199/api/public/healthz > /dev/null 2>&1; then
    echo "API ready after ${i}s"
    break
  fi
  if [ $i -eq 180 ]; then
    echo "API failed to become ready in 180s — aborting" >&2
    exit 1
  fi
  sleep 1
done

# Fetch OpenAPI and convert. openapi-typescript v7.4.x lstat()s its positional
# argument before checking for stdin, so passing `-` raises ENOENT inside
# Docker. Write to a temp file instead — works in every environment.
TMP_SCHEMA="$(mktemp -t openapi.XXXXXX.json)"
trap 'kill $API_PID 2>/dev/null || true; rm -f "$TMP_SCHEMA"' EXIT
curl -fsS http://127.0.0.1:9199/openapi.json -o "$TMP_SCHEMA"
pnpm exec openapi-typescript "$TMP_SCHEMA" --output "$OUT"

echo "✓ Generated $OUT"
