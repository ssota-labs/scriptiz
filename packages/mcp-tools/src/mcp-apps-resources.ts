import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SCRIPTIZ_MCP_APP_RESOURCE_URI } from "./mcp-apps-constants.js";

const PKG_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scriptiz</title>
</head>
<body>
  <p><strong>Scriptiz MCP App</strong> — embed bundle not found. Run <code>pnpm --filter @scriptiz/mcp-tools run build:widget</code> (outputs <code>web/dist-embed/embed-inlined.html</code>), or set <code>SCRIPTIZ_MCP_EMBED_HTML</code>.</p>
</body>
</html>
`;

/** CSP for YouTube iframe embeds in the transcript view. */
const SCRIPTIZ_WIDGET_CSP = {
  resourceDomains: [
    "https://www.youtube.com",
    "https://www.youtube-nocookie.com",
    "https://i.ytimg.com",
    "https://img.youtube.com",
  ],
  connectDomains: ["https://www.youtube.com"],
};

async function loadMcpAppHtml(): Promise<string> {
  const fromEnv = process.env.SCRIPTIZ_MCP_EMBED_HTML?.trim();
  const candidates = [
    fromEnv,
    path.join(PKG_ROOT, "web/dist-embed/embed-inlined.html"),
    process.env.SCRIPTIZ_MCP_UI_DIST?.trim()
      ? path.join(process.env.SCRIPTIZ_MCP_UI_DIST.trim(), "index.html")
      : null,
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      return await readFile(p, "utf8");
    } catch {
      // try next
    }
  }
  return FALLBACK_HTML;
}

/**
 * Registers the `ui://` HTML resource for MCP Apps hosts (`text/html;profile=mcp-app`).
 */
export function registerScriptizMcpAppResource(server: McpServer): void {
  registerAppResource(
    server,
    "Scriptiz MCP App",
    SCRIPTIZ_MCP_APP_RESOURCE_URI,
    {
      description: "Interactive UI for Scriptiz MCP tools (MCP Apps)",
      _meta: {
        ui: {
          prefersBorder: true,
          csp: SCRIPTIZ_WIDGET_CSP,
        },
      },
    },
    async (uri) => {
      const text = await loadMcpAppHtml();
      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: RESOURCE_MIME_TYPE,
            text,
            _meta: {
              ui: {
                prefersBorder: true,
                csp: SCRIPTIZ_WIDGET_CSP,
              },
            },
          },
        ],
      };
    },
  );
}
