#!/usr/bin/env bash
# All-in-one: worker in background, MCP server in foreground (stdio for MCP clients).
set -euo pipefail
cd /app || exit 1

node apps/worker/dist/index.js &
worker_pid=$!
trap 'kill "$worker_pid" 2>/dev/null || true' EXIT INT TERM

# stdio transport; do not run headless health-only mode
export SCRIPTIZ_MCP_START_STDIO="${SCRIPTIZ_MCP_START_STDIO:-1}"
unset HEALTH_CHECK_PORT

exec node apps/mcp-server/dist/index.js
