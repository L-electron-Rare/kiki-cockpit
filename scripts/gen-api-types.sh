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

# Wait for it to be up. Lifespan does HF API fetches (~10s for 30 models) so
# we need a generous timeout — 60s × 1s = 60s ceiling.
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:9199/api/public/healthz > /dev/null 2>&1; then
    echo "API ready after ${i}s"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "API failed to become ready in 60s — aborting" >&2
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
