# Releasing `@scriptiz/mcp` and the all-in-one Docker image

This document describes how to publish the npm launcher and the Docker image used by `npx -y @scriptiz/mcp`. Until these steps are run, users can build locally with `pnpm docker:build:mcp` and `SCRIPTIZ_DOCKER_IMAGE=scriptiz-mcp:local`.

## Artifacts

1. **Docker image** (default tag in launcher: `ghcr.io/ssota-labs/scriptiz-mcp:latest`)
  - Built from `[docker/Dockerfile.mcp-all-in-one](../docker/Dockerfile.mcp-all-in-one)`.
  - Entry `[docker/entrypoint.mcp-all-in-one.sh](../docker/entrypoint.mcp-all-in-one.sh)`: worker in background, MCP server in foreground (stdio).
2. **npm package** `[@scriptiz/mcp](../packages/mcp-launcher)`: thin launcher that runs `docker run --rm -i` with the correct volume and environment forwarding.

## Versioning

- Keep the Docker image tag and the npm package version aligned when possible (e.g. `0.1.0` on npm and `ghcr.io/ssota-labs/scriptiz-mcp:0.1.0`).
- The launcher defaults to `:latest`; for reproducible installs, users can set `SCRIPTIZ_DOCKER_IMAGE=ghcr.io/ssota-labs/scriptiz-mcp:0.1.0`.

## Publish Docker image (GHCR example)

```bash
# From repo root, after tests pass
export VERSION=0.1.0
export REGISTRY=ghcr.io
export IMAGE_NAME="$REGISTRY/ssota-labs/scriptiz-mcp"

docker build -f docker/Dockerfile.mcp-all-in-one -t "$IMAGE_NAME:$VERSION" -t "$IMAGE_NAME:latest" .
docker push "$IMAGE_NAME:$VERSION"
docker push "$IMAGE_NAME:latest"
```

Use a token whose user has **Packages: write** on the `ssota-labs` org (or push under your user and set `SCRIPTIZ_DOCKER_IMAGE` accordingly). Ensure `docker login ghcr.io` succeeds before `docker push`.

## Publish npm package

```bash
cd packages/mcp-launcher
# Set version in package.json to match release
npm publish --access public
```

Prerequisites:

- `@scriptiz/mcp` name is available on npm for your org, or change `name` in `[package.json](../packages/mcp-launcher/package.json)`.
- `repository.url` in `package.json` matches the public git URL.

## Publish `@scriptiz/mcp-tools` (library consumers, e.g. hosted MCP)

Downstream repos (such as a cloud-hosted MCP server) may depend on `@scriptiz/mcp-tools` to call `createScriptizMcpServer` / `createScriptizMcpContext` without copying `apps/mcp-server`.

- **Registry:** After `0.1.1` is published, depend on `"@scriptiz/mcp-tools": "^0.1.1"`. The `0.1.0` tarball on npm does not include `createScriptizMcpServer`; treat `0.1.1` as the first consumer-ready API for that entry point.
- **Publish** (from repo root, after `pnpm build`):

```bash
cd packages/mcp-tools
npm publish --access public
```

- *Vendoring without `workspace:` (single-repo clone / CI):** From repo root, pack replaces `workspace:`* in the published manifest with concrete versions already on npm:

```bash
pnpm -r run build
pnpm --filter @scriptiz/mcp-tools pack --pack-destination .
# writes scriptiz-mcp-tools-<version>.tgz to the repo root (gitignored by /scriptiz-mcp-tools-*.tgz)
```

Point the downstream `package.json` at the file until the registry has `0.1.1`:

```json
"@scriptiz/mcp-tools": "file:../../vendor/scriptiz-mcp-tools-0.1.1.tgz"
```

Do **not** use `file:../open-scriptiz/packages/mcp-tools` across repos: the source package still contains `workspace:`*, which `pnpm` cannot resolve in a standalone checkout.

## CI (optional, later)

- On tag `v`*, build and push the Docker image to GHCR.
- On tag `v`*, publish `@scriptiz/mcp` from `packages/mcp-launcher`.
- Run `pnpm test:docker-mcp-smoke` in CI when Docker is available.

## Smoke tests locally

```bash
pnpm docker:build:mcp
pnpm test:docker-mcp-smoke
```

