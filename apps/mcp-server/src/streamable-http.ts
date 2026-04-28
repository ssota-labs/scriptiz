import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { URL } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ScriptizMcpContext } from "@scriptiz/mcp-tools";
import { createScriptizMcpServer } from "@scriptiz/mcp-tools";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "content-type, authorization, mcp-protocol-version, mcp-session-id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };
}

function applyCors(res: ServerResponse) {
  for (const [k, v] of Object.entries(corsHeaders())) {
    res.setHeader(k, v);
  }
}

/**
 * Streamable HTTP MCP at `{base}/mcp` (OpenAI Apps SDK / MCP Inspector compatible).
 * @see https://developers.openai.com/apps-sdk/deploy/testing
 */
export function startStreamableHttpMcp(
  ctx: ScriptizMcpContext,
  options: {
    port: number;
    host: string;
    pathname: string;
  },
): void {
  const { port, host, pathname } = options;

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    applyCors(res);

    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === pathname) {
      res.writeHead(204).end();
      return;
    }

    if (url.pathname !== pathname) {
      res.writeHead(404).end("Not Found");
      return;
    }

    const server = createScriptizMcpServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (e) {
      console.error("[mcp-server] Streamable HTTP error:", e);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" }).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal MCP server error" },
            id: null,
          }),
        );
      }
    }
  });

  httpServer.listen(port, host, () => {
    console.error(
      `[mcp-server] Streamable HTTP MCP → http://${host}:${port}${pathname} (MCP Inspector, OpenAI testing)`,
    );
  });
}
