#!/usr/bin/env bash
# Legacy split compose: mcp-server /healthz only (dev debugging).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker-compose-smoke: skip (docker not on PATH)" >&2
  exit 0
fi

PROJECT="${COMPOSE_PROJECT_NAME:-scriptiz_compose_smoke_$$}"
export COMPOSE_PROJECT_NAME="$PROJECT"

cleanup() {
  docker compose -f docker-compose.yml down
}
trap cleanup EXIT

docker compose -f docker-compose.yml up -d --build
for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8080/healthz" > /dev/null; then
    echo "docker-compose-smoke: /healthz ok (project=$PROJECT)"
    exit 0
  fi
  sleep 1
done
echo "docker-compose-smoke: health check failed" >&2
exit 1
