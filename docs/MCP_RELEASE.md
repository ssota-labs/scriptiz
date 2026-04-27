# Releasing `@scriptiz/mcp` and the all-in-one Docker image

This document describes how to publish the npm launcher and the Docker image used by `npx -y @scriptiz/mcp`. Until these steps are run, users can build locally with `pnpm docker:build:mcp` and `SCRIPTIZ_DOCKER_IMAGE=scriptiz-mcp:local`.

## Artifacts

1. **Docker image** (default tag in launcher: `ghcr.io/scriptiz/scriptiz-mcp:latest`)
   - Built from [`docker/Dockerfile.mcp-all-in-one`](../docker/Dockerfile.mcp-all-in-one).
   - Entry [`docker/entrypoint.mcp-all-in-one.sh`](../docker/entrypoint.mcp-all-in-one.sh): worker in background, MCP server in foreground (stdio).

2. **npm package** [`@scriptiz/mcp`](../packages/mcp-launcher): thin launcher that runs `docker run --rm -i` with the correct volume and environment forwarding.

## Versioning

- Keep the Docker image tag and the npm package version aligned when possible (e.g. `0.1.0` on npm and `ghcr.io/.../scriptiz-mcp:0.1.0`).
- The launcher defaults to `:latest`; for reproducible installs, users can set `SCRIPTIZ_DOCKER_IMAGE=ghcr.io/OWNER/scriptiz-mcp:0.1.0`.

## Publish Docker image (GHCR example)

```bash
# From repo root, after tests pass
export VERSION=0.1.0
export REGISTRY=ghcr.io
export IMAGE_NAME="$REGISTRY/OWNER/scriptiz-mcp"

docker build -f docker/Dockerfile.mcp-all-in-one -t "$IMAGE_NAME:$VERSION" -t "$IMAGE_NAME:latest" .
docker push "$IMAGE_NAME:$VERSION"
docker push "$IMAGE_NAME:latest"
```

Replace `OWNER` with your GitHub org or user. Ensure the repository/package exists and `GITHUB_TOKEN` or `docker login ghcr.io` is configured.

## Publish npm package

```bash
cd packages/mcp-launcher
# Set version in package.json to match release
npm publish --access public
```

Prerequisites:

- `@scriptiz/mcp` name is available on npm for your org, or change `name` in [`package.json`](../packages/mcp-launcher/package.json).
- `repository.url` in `package.json` matches the public git URL.

## CI (optional, later)

- On tag `v*`, build and push the Docker image to GHCR.
- On tag `v*`, publish `@scriptiz/mcp` from `packages/mcp-launcher`.
- Run `pnpm test:docker-mcp-smoke` in CI when Docker is available.

## Smoke tests locally

```bash
pnpm docker:build:mcp
pnpm test:docker-mcp-smoke
```
