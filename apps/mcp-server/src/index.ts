import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { defaultScriptizDataDir } from "@scriptiz/core";
import { createServer } from "node:http";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { createScriptizMcpContext, createScriptizMcpServer } from "@scriptiz/mcp-tools";

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

async function main() {
  const dataDir = dataDirFromEnv();
  await mkdir(dataDir, { recursive: true });
  startHealthCheckIfConfigured();
  const ctx = createScriptizMcpContext({ dataDir });
  const server = createScriptizMcpServer(ctx);

  const startStdio =
    process.env.SCRIPTIZ_MCP_START_STDIO !== "0" &&
    process.env.SCRIPTIZ_MCP_START_STDIO !== "false";
  if (!startStdio) {
    await new Promise(() => {
      /* headless: health check only (Docker, workers share volume; run MCP on host) */
    });
  } else {
    const t = new StdioServerTransport();
    await server.connect(t);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
