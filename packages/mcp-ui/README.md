# `@scriptiz/mcp-ui`

Two parts in one package:

1. **`src/`** — TypeScript **builders and Zod schemas** for MCP tool result JSON (`video_transcript_view`, `list_view`, `job_status_view`). Published as `dist/` on npm (`files: ["dist"]`).
2. **`web/`** — Vite + React **MCP Apps** UI: source for the HTML the host loads in a sandboxed iframe ([MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)). Build output: **`web/dist/`** (gitignored). Not included in the npm tarball by default.

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm build` | `tsc` — Node library only |
| `pnpm build:web` | `tsc -b web` + Vite → `web/dist` |
| `pnpm dev:web` | Vite dev server (HMR) |
| `pnpm preview:web` | Preview production build |
| `pnpm lint:web` | ESLint for `web/` |

From repo root: `pnpm dev:ui` runs `dev:web` here.

## MCP server: serve the built HTML

```bash
pnpm --filter @scriptiz/mcp-ui run build:web
export SCRIPTIZ_MCP_UI_DIST=/absolute/path/to/scriptiz/packages/mcp-ui/web/dist
```

If unset, `packages/mcp-tools` serves a minimal placeholder for `ui://scriptiz/app`.

## Next steps

- Implement the MCP Apps **`ui/*`** bridge in the web app (`@modelcontextprotocol/ext-apps`).
- Optionally add `web/dist` to npm `files` or bake into Docker images.
