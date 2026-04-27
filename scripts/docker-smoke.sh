#!/usr/bin/env bash
# Primary smoke: all-in-one MCP image + @scriptiz/mcp launcher + real stdio/tool flow.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker-smoke: skip (docker not on PATH)" >&2
  exit 0
fi

IMAGE="${SCRIPTIZ_DOCKER_IMAGE:-scriptiz-mcp:local}"
export SCRIPTIZ_DOCKER_IMAGE="$IMAGE"
export SCRIPTIZ_DOCKER_PULL="${SCRIPTIZ_DOCKER_PULL:-never}"
export WORKER_POLL_INTERVAL_MS="${WORKER_POLL_INTERVAL_MS:-500}"

VOL_CLEANUP=""
if [[ -z "${SCRIPTIZ_DOCKER_VOLUME:-}" ]]; then
  export SCRIPTIZ_DOCKER_VOLUME="scriptiz-smoke-$$"
  VOL_CLEANUP="$SCRIPTIZ_DOCKER_VOLUME"
fi

cleanup() {
  if [[ -n "$VOL_CLEANUP" ]]; then
    docker volume rm -f "$VOL_CLEANUP" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ "$IMAGE" == "scriptiz-mcp:local" ]]; then
  echo "docker-smoke: building ${IMAGE}..."
  docker build -f docker/Dockerfile.mcp-all-in-one -t scriptiz-mcp:local .
fi

node --check "${ROOT}/scripts/mcp-docker-smoke.mjs"
echo "docker-smoke: MCP stdio + extraction flow (volume=${SCRIPTIZ_DOCKER_VOLUME})..."
node "${ROOT}/scripts/mcp-docker-smoke.mjs"
