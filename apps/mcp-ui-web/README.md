# MCP UI Web (Scriptiz)

Vite + React app: **source** for the **MCP Apps** HTML that hosts (ChatGPT, Claude, Copilot, …) load in a **sandboxed iframe** per the [MCP Apps extension](https://modelcontextprotocol.io/extensions/apps/overview) and [ChatGPT compatibility](https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt).

## How this relates to `packages/mcp-ui` and the server

| Piece | Role |
| ----- | ---- |
| **`@scriptiz/mcp-ui`** | TypeScript **builders + Zod schemas** for *tool result JSON* (transcript view, list view, job view). Used by `packages/mcp-tools` handlers. |
| **`@scriptiz/mcp-server`** | Registers tools with `_meta.ui.resourceUri` → `ui://scriptiz/app` and a `resources/read` handler that serves **HTML** (`text/html`). |
| **`mcp-ui-web` (this app)** | The **web UI you author**; `pnpm build` → `dist/`. For production, point the server at the build: **`SCRIPTIZ_MCP_UI_DIST=.../dist`** (see below). **Nothing Node-side “renders” the app**—the **browser inside the host iframe** runs the bundle. |
| **Local `pnpm dev:ui`** | Fast iteration (HMR) **without** an MCP host. For **full** MCP Apps behavior you still need a host that implements the iframe + `ui/*` bridge; the dev server alone is not a substitute. |

So: **not** `mcp-ui` “rendering” in Node, and **not** “mcp-ui-web is the iframe” as a process—**the built `index.html` + assets** are what the host puts **inside** the iframe after fetching the `ui://` resource from your MCP server.

## Run (development)

From the repository root (Node 22+, pnpm as in root `package.json`):

```bash
pnpm install
pnpm dev:ui
```

Or from this directory: `pnpm dev` — then open the URL Vite prints (usually `http://localhost:5173`).

## Build (for MCP server to serve the real app)

```bash
pnpm --filter mcp-ui-web run build
```

Point the MCP process at the output (absolute path on your machine or in the image):

```bash
export SCRIPTIZ_MCP_UI_DIST=/path/to/scriptiz/apps/mcp-ui-web/dist
```

If unset, the server serves a small **placeholder** HTML (still valid `text/html` for `ui://scriptiz/app`).

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Vite dev server          |
| `pnpm build`   | Production build         |
| `pnpm preview` | Preview production build |
| `pnpm lint`    | ESLint                   |

## Next steps (product)

- Wire the shipped bundle to the **MCP Apps** host bridge (`ui/*` over `postMessage`); use [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps) or the spec’s postMessage protocol.
- Map **tool result JSON** and `ui/notifications/tool-input` / `tool-result` in the app instead of relying on paste-only dev flows.
