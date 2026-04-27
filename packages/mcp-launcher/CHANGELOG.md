# @scriptiz/mcp

## 0.1.3

### Patch Changes

- Fix `extract_playlist` when yt-dlp returns one NDJSON line per item (synthetic playlist root with real `playlist_id`). Fix `extract_channel_latest` for channel `/videos` tabs the same way (correct channel title and populated `items`). Add unit tests for both handlers.

## 0.1.2

### Patch Changes

- 969e1ec: Default `SCRIPTIZ_DOCKER_IMAGE` is `ghcr.io/ssota-labs/scriptiz-mcp:latest` (GitHub org `ssota-labs`, not the npm `@scriptiz` scope).

## 0.1.1

- Default `SCRIPTIZ_DOCKER_IMAGE` is `ghcr.io/ssota-labs/scriptiz-mcp:latest` (GitHub org for this repo, not the npm `@scriptiz` scope).

## 0.1.0

### Minor Changes

- 3533955: First npm release for consumers outside this repo (e.g. scriptiz-cloud).
