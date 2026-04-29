# @scriptiz/core

## 1.0.0

### Major Changes

- Remove user list layer and MCP Apps/widget UI; MCP tools are JSON-only extraction helpers. Improve yt-dlp thumbnail URL selection in mapped resources.

### Patch Changes

- Updated dependencies
  - @scriptiz/schemas@1.0.0

## 0.1.1

### Patch Changes

- 484d7da: MCP Apps: `_meta.ui.resourceUri` → `ui://scriptiz/app`, `resources/read` serves HTML (optional `SCRIPTIZ_MCP_UI_DIST`). ChatGPT compatibility: `openai/outputTemplate`.

  Fold `@scriptiz/mcp-ui` into `@scriptiz/mcp-tools` (`@scriptiz/mcp-tools/ui`, Vite app under `packages/mcp-tools/web`). All MCP tools share the same `_meta.ui` for `ui://scriptiz/app`.

  Remove dedicated MCP tools `get_video_transcript_view`, `get_list_view`, and `get_job_status_view`. Use `get_timed_transcript`, `get_list_contents`, and `get_extraction_status` (and related data tools) for transcripts, lists, and jobs; MCP Apps hosts use the shared HTML with those results.

  Add `ensureScriptizDataLayout` in `@scriptiz/core` (MCP server and worker call it at startup) with clear errors when a storage subpath is a file instead of a directory.

## 0.1.0

### Minor Changes

- 3533955: First npm release for consumers outside this repo (e.g. scriptiz-cloud).

### Patch Changes

- Updated dependencies [3533955]
  - @scriptiz/schemas@0.1.0
