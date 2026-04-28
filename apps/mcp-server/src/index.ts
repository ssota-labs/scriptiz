import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { defaultScriptizDataDir, ensureScriptizDataLayout } from "@scriptiz/core";
import { createServer } from "node:http";
import path from "node:path";
import { createScriptizMcpContext, createScriptizMcpServer } from "@scriptiz/mcp-tools";

import { startStreamableHttpMcp } from "./streamable-http.js";

export { SCRIPTIZ_MCP_SERVER_NAME } from "@scriptiz/mcp-tools";

function dataDirFromEnv(): string {
  const raw = process.env.DATA_DIR?.trim();
  return raw ? path.resolve(raw) : defaultScriptizDataDir();
}

function startHealthCheckIfConfigured() {
  const port = process.env.HEALTH_CHECK_PORT?.trim();
  if (!port) {
    return;
  }
  const p = Number.parseInt(port, 10);
  if (Number.isNaN(p) || p <= 0) {
    throw new Error("HEALTH_CHECK_PORT must be a positive integer");
  }
  const s = createServer((req, res) => {
    if (req.url === "/healthz" || req.url === "/") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    res.writeHead(404);
    res.end();
  });
  s.listen(p, "0.0.0.0", () => {
    console.error(`[mcp-server] health check on :${p} (/healthz)`);
  });
}

function streamableHttpOptionsFromEnv():
  | { port: number; host: string; pathname: string }
  | null {
  const raw = process.env.MCP_HTTP_PORT?.trim();
  if (!raw) {
    return null;
  }
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new Error("MCP_HTTP_PORT must be a valid TCP port (1–65535)");
  }
  const host = process.env.MCP_HTTP_HOST?.trim() || "127.0.0.1";
  const pathname = (() => {
    const p = process.env.MCP_HTTP_PATH?.trim() || "/mcp";
    return p.startsWith("/") ? p : `/${p}`;
  })();
  return { port, host, pathname };
}

async function main() {
  const dataDir = dataDirFromEnv();
  await ensureScriptizDataLayout(dataDir);
  startHealthCheckIfConfigured();
  const ctx = createScriptizMcpContext({ dataDir });

  const httpOpts = streamableHttpOptionsFromEnv();
  if (httpOpts) {
    startStreamableHttpMcp(ctx, httpOpts);
  }

  const startStdio =
    process.env.SCRIPTIZ_MCP_START_STDIO !== "0" &&
    process.env.SCRIPTIZ_MCP_START_STDIO !== "false";
  if (startStdio) {
    const server = createScriptizMcpServer(ctx);
    const t = new StdioServerTransport();
    await server.connect(t);
  } else if (!httpOpts) {
    await new Promise(() => {
      /* headless: health check only (Docker, workers share volume; run MCP on host) */
    });
  } else {
    await new Promise(() => {
      /* HTTP-only MCP: keep process alive */
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
