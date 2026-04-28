#!/usr/bin/env bash
# OpenAI Apps SDK / MCP Inspector용 로컬 MCP: Streamable HTTP + ui:// 임베드 HTML
# 사용: pnpm dev:mcp-http  /  MCP_HTTP_PORT=3000 pnpm dev:mcp-http
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[openai-mcp] building @scriptiz/mcp-tools (tsc + widget embed)..."
pnpm --filter @scriptiz/mcp-tools run build
pnpm --filter @scriptiz/mcp-tools run build:widget

echo "[openai-mcp] building @scriptiz/mcp-server..."
pnpm --filter @scriptiz/mcp-server run build

EMBED="${ROOT}/packages/mcp-tools/web/dist-embed/embed-inlined.html"
if [[ -f "${EMBED}" ]]; then
  export SCRIPTIZ_MCP_EMBED_HTML="${EMBED}"
  echo "[openai-mcp] SCRIPTIZ_MCP_EMBED_HTML=${EMBED}"
else
  echo "[openai-mcp] warning: missing ${EMBED} (ui:// will use fallback HTML)"
fi

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

exec node "${ROOT}/apps/mcp-server/dist/index.js"
