#!/usr/bin/env bash
# Build all-in-one MCP image and verify artifacts; optional launcher syntax check.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker-mcp-smoke: skip (docker not on PATH)"
  exit 0
fi

echo "docker-mcp-smoke: building scriptiz-mcp:local..."
docker build -f docker/Dockerfile.mcp-all-in-one -t scriptiz-mcp:local .

echo "docker-mcp-smoke: verifying image contents..."
docker run --rm --entrypoint sh scriptiz-mcp:local -c \
  'test -f /app/apps/mcp-server/dist/index.js && \
   test -f /app/apps/worker/dist/index.js && \
   test -x /usr/local/bin/scriptiz-mcp && \
   echo docker-mcp-smoke: image ok'

node --check "${ROOT}/packages/mcp-launcher/bin/scriptiz-mcp.js"
echo "docker-mcp-smoke: launcher syntax ok"
