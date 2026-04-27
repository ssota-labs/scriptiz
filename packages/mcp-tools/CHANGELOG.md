# @scriptiz/mcp-tools

## 0.1.1

### Patch Changes

- Export `createScriptizMcpServer` (and related factory/context helpers) for hosted MCP transports that reuse the same tool surface as `apps/mcp-server` without stdio.
- The `0.1.0` npm tarball predates this API; consumers that need `createScriptizMcpServer` should use `^0.1.1`, or vendor a `pnpm pack` tarball until `0.1.1` is on the registry (see [MCP_RELEASE.md](../../docs/MCP_RELEASE.md)).

## 0.1.0

### Minor Changes

- 3533955: First npm release for consumers outside this repo (e.g. scriptiz-cloud).

### Patch Changes

- Updated dependencies [3533955]
  - @scriptiz/core@0.1.0
  - @scriptiz/extractor-ytdlp@0.1.0
  - @scriptiz/mcp-ui@0.1.0
  - @scriptiz/ports@0.1.0
  - @scriptiz/queue-local@0.1.0
  - @scriptiz/schemas@0.1.0
  - @scriptiz/storage-filesystem@0.1.0
