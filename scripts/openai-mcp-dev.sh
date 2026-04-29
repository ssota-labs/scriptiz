#!/usr/bin/env bash
# MCP Inspector용 로컬 MCP: Streamable HTTP (stdio는 기본 별도)
# 사용: pnpm dev:mcp-http  /  MCP_HTTP_PORT=3000 pnpm dev:mcp-http
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[openai-mcp] building @scriptiz/mcp-tools (tsc)..."
pnpm --filter @scriptiz/mcp-tools run build

echo "[openai-mcp] building @scriptiz/mcp-server..."
pnpm --filter @scriptiz/mcp-server run build

export MCP_HTTP_PORT="${MCP_HTTP_PORT:-2091}"
export MCP_HTTP_HOST="${MCP_HTTP_HOST:-127.0.0.1}"
export MCP_HTTP_PATH="${MCP_HTTP_PATH:-/mcp}"
export SCRIPTIZ_MCP_START_STDIO="${SCRIPTIZ_MCP_START_STDIO:-0}"

export DATA_DIR="${DATA_DIR:-${HOME}/.scriptiz}"
mkdir -p "${DATA_DIR}"

echo ""
echo "[openai-mcp] Streamable HTTP → http://${MCP_HTTP_HOST}:${MCP_HTTP_PORT}${MCP_HTTP_PATH}"
echo "[openai-mcp] 다른 터미널: pnpm openai:mcp-inspector"
echo ""

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:"${MCP_HTTP_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "[openai-mcp] error: port ${MCP_HTTP_PORT} is already in use:" >&2
    lsof -nP -iTCP:"${MCP_HTTP_PORT}" -sTCP:LISTEN >&2 || true
    echo "[openai-mcp] stop that process (e.g. kill PID above) or use another port:" >&2
    echo "[openai-mcp]   MCP_HTTP_PORT=2092 pnpm dev:mcp-http" >&2
    exit 1
  fi
fi

exec node "${ROOT}/apps/mcp-server/dist/index.js"
