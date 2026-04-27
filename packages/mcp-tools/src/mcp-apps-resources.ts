import { readFile } from "node:fs/promises";
import path from "node:path";
import type { McpServer, ReadResourceCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SCRIPTIZ_MCP_APP_RESOURCE_URI } from "./mcp-apps-constants.js";

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scriptiz</title>
</head>
<body>
  <p><strong>Scriptiz MCP App</strong> (shell). This page is loaded in the host&rsquo;s sandboxed iframe per <a href="https://modelcontextprotocol.io/extensions/apps/overview" target="_blank" rel="noopener">MCP Apps</a>.</p>
  <p>Tool handlers still return JSON for compatibility; the interactive <code>ui/*</code> bridge and bundled UI from <code>packages/mcp-tools/web</code> are expanded in follow-up work. Set <code>SCRIPTIZ_MCP_UI_DIST</code> to <code>…/packages/mcp-tools/web/dist</code> (after <code>pnpm --filter @scriptiz/mcp-tools run build:web</code>) to serve <code>index.html</code> instead of this placeholder.</p>
</body>
</html>
`;

async function loadMcpAppHtml(): Promise<string> {
  const dist = process.env.SCRIPTIZ_MCP_UI_DIST?.trim();
  if (!dist) {
    return FALLBACK_HTML;
  }
  const indexPath = path.join(dist, "index.html");
  return readFile(indexPath, "utf8");
}

const readScriptizMcpApp: ReadResourceCallback = async (uri) => {
  const text = await loadMcpAppHtml();
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: "text/html",
        text,
      },
    ],
  };
};

/**
 * Registers the `ui://` HTML resource for MCP Apps hosts to fetch and render in an iframe.
 */
export function registerScriptizMcpAppResource(server: McpServer): void {
  server.registerResource(
    "scriptiz-mcp-app",
    SCRIPTIZ_MCP_APP_RESOURCE_URI,
    {
      title: "Scriptiz MCP App",
      description: "Interactive UI for Scriptiz tools (MCP Apps)",
    },
    readScriptizMcpApp,
  );
}
