#!/usr/bin/env bash
# Generate TypeScript types from FastAPI's OpenAPI schema.
# Boots the API briefly, fetches /openapi.json, runs openapi-typescript.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/packages/shared/src/api/types.ts"

mkdir -p "$(dirname "$OUT")"

# Boot API in background
cd "$ROOT"
uv run uvicorn kiki_cockpit.main:app --host 127.0.0.1 --port 9199 &
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
