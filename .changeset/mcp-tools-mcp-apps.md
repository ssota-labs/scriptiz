---
"@scriptiz/mcp-tools": patch
---

Align UI tools with [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview): `_meta.ui.resourceUri` → `ui://scriptiz/app`, `resources/read` serves HTML (optional `SCRIPTIZ_MCP_UI_DIST`). ChatGPT compatibility: `openai/outputTemplate`.

Remove the separate `@scriptiz/mcp-ui` package: payload builders live under `@scriptiz/mcp-tools` (import `@scriptiz/mcp-tools/ui` or the root package exports), and the Vite MCP Apps shell is `packages/mcp-tools/web` (set `SCRIPTIZ_MCP_UI_DIST` to that `dist`). All MCP tools include the same `_meta.ui` for the shared `ui://scriptiz/app` HTML.
