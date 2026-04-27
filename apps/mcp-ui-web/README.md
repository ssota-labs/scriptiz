# MCP UI Web (Scriptiz)

Local **demo app** for rendering [MCP UI](https://spec.modelcontextprotocol.io/specification/2025-06-18/client/resources#user-interaction) payloads produced by Scriptiz (`get_video_transcript_view`, `get_list_view`, `get_job_status_view`). It is **not** the production MCP server; it helps validate `@scriptiz/mcp-ui` schemas and layout during development.

## Role in the monorepo

- **Package:** `mcp-ui-web` (private), Vite + React + TypeScript.
- **Data:** Uses built-in sample payloads and optional JSON paste—no live MCP connection in this app.
- **Shared types/views:** [`@scriptiz/mcp-ui`](../../packages/mcp-ui) (workspace).

See the root [README](../../README.md) (Architecture → `apps/mcp-ui-web`) and product docs in [`apps/docs`](../../apps/docs) for the full Scriptiz story.

## Run

From the repository root (Node 22+, pnpm as in root `package.json`):

```bash
pnpm install
pnpm dev:ui
```

Or from this directory:

```bash
pnpm dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command   | Description        |
| --------- | ------------------ |
| `pnpm dev` | Vite dev server     |
| `pnpm build` | Production build  |
| `pnpm preview` | Preview production build |
| `pnpm lint` | ESLint             |

## Notes

- This UI is a **developer convenience**; end users typically use `npx -y @scriptiz/mcp` and a real MCP client (see root README).
- To change how payloads look, edit components under `src/mcp-ui/` and types in `packages/mcp-ui` as needed.
