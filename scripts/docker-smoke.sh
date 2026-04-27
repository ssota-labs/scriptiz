#!/usr/bin/env bash
# Optional CI/local check: build images, wait for mcp-server /healthz, then tear down.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
docker compose -f docker-compose.yml up -d --build
cleanup() {
  docker compose -f docker-compose.yml down
}
trap cleanup EXIT
for i in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8080/healthz" > /dev/null; then
    echo "docker-smoke: /healthz ok"
    exit 0
  fi
  sleep 1
done
echo "docker-smoke: health check failed" >&2
exit 1
