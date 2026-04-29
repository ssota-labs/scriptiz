#!/usr/bin/env bash
# MCP Inspector for local Streamable HTTP (default scriptiz MCP on 2091).
# If default UI/proxy ports (6274 / 6277) are taken, picks the next free ones.
# Override: CLIENT_PORT=8080 SERVER_PORT=9000 pnpm openai:mcp-inspector
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MCP_HTTP_PORT="${MCP_HTTP_PORT:-2091}"
MCP_HTTP_PATH="${MCP_HTTP_PATH:-/mcp}"
SERVER_URL="${MCP_INSPECTOR_SERVER_URL:-http://127.0.0.1:${MCP_HTTP_PORT}${MCP_HTTP_PATH}}"

DEFAULT_CLIENT_PORT=6274
DEFAULT_SERVER_PORT=6277

next_free_port() {
  local p=$1
  local max=$((p + 64))
  while [[ "$p" -lt "$max" ]]; do
    if ! lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "$p"
      return 0
    fi
    p=$((p + 1))
  done
  echo "[openai-mcp-inspector] error: no free TCP port in range (tried up to ${max})" >&2
  exit 1
}

resolve_port() {
  local var_name=$1
  local default_p=$2
  local current="${!var_name-}"
  if [[ -n "${current}" ]]; then
    return 0
  fi
  if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"${default_p}" -sTCP:LISTEN >/dev/null 2>&1; then
    printf -v "${var_name}" '%s' "$(next_free_port "${default_p}")"
  else
    printf -v "${var_name}" '%s' "${default_p}"
  fi
}

resolve_port CLIENT_PORT "${DEFAULT_CLIENT_PORT}"
resolve_port SERVER_PORT "${DEFAULT_SERVER_PORT}"

if [[ "${CLIENT_PORT}" == "${SERVER_PORT}" ]]; then
  SERVER_PORT="$(next_free_port "$((SERVER_PORT + 1))")"
fi

export CLIENT_PORT
export SERVER_PORT

echo "[openai-mcp-inspector] MCP: ${SERVER_URL}"
echo "[openai-mcp-inspector] UI: http://127.0.0.1:${CLIENT_PORT}  (proxy port ${SERVER_PORT})"
echo ""

exec npx --yes @modelcontextprotocol/inspector@latest \
  --transport http \
  --server-url "${SERVER_URL}"
