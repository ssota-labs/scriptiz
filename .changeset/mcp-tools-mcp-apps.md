---
"@scriptiz/core": patch
"@scriptiz/mcp-tools": patch
---

MCP Apps: `_meta.ui.resourceUri` → `ui://scriptiz/app`, `resources/read` serves HTML (optional `SCRIPTIZ_MCP_UI_DIST`). ChatGPT compatibility: `openai/outputTemplate`.

Fold `@scriptiz/mcp-ui` into `@scriptiz/mcp-tools` (`@scriptiz/mcp-tools/ui`, Vite app under `packages/mcp-tools/web`). All MCP tools share the same `_meta.ui` for `ui://scriptiz/app`.

Remove `get_video_transcript_view`, `get_list_view`, and `get_job_status_view`. Use `get_timed_transcript`, `get_list_contents`, and `get_extraction_status` (and related tools) for data; MCP Apps hosts use the shared HTML with those results.

Add `ensureScriptizDataLayout` in `@scriptiz/core` (MCP server and worker call it at startup) with clear errors when a storage subpath is a file instead of a directory.
