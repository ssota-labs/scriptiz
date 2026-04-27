import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "node:http";
import { createScriptizMcpContext, runScriptizTool } from "@scriptiz/mcp-tools";
import { z } from "zod";
import * as schemas from "@scriptiz/mcp-tools";

export const appName = "@scriptiz/mcp-server" as const;

function dataDirFromEnv(): string {
  const raw = process.env.DATA_DIR?.trim();
  if (!raw) {
    throw new Error("DATA_DIR environment variable is required");
  }
  return raw;
}

function jsonResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(payload, null, 0),
      },
    ],
  };
}

function wrapTool(
  ctx: ReturnType<typeof createScriptizMcpContext>,
  name: string,
) {
  return async (args: unknown) => {
    const out = await runScriptizTool(name, args, ctx);
    if (
      typeof out === "object" &&
      out !== null &&
      "ok" in out &&
      (out as { ok: boolean }).ok === false
    ) {
      return {
        ...jsonResult(out),
        isError: true as const,
      };
    }
    return jsonResult(out);
  };
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
  startHealthCheckIfConfigured();
  const ctx = createScriptizMcpContext({ dataDir });

  const server = new McpServer(
    { name: appName, version: "0.0.0" },
    { capabilities: { tools: {} } },
  );

  const reg = (
    name: string,
    description: string,
    input: z.ZodType<unknown>,
  ) => {
    server.registerTool(
      name,
      {
        description,
        inputSchema: input,
      },
      wrapTool(ctx, name),
    );
  };

  reg(
    "extract_content",
    "Queue a YouTube video extraction job (metadata + captions).",
    schemas.extractContentInput,
  );
  reg(
    "get_extraction_status",
    "Get extraction job status by job id.",
    schemas.jobIdInput,
  );
  reg("get_content", "Get resource and transcript language info.", schemas.getContentInput);
  reg(
    "get_transcript",
    "Get transcript text (optionally with timestamps) with optional cursor continuation.",
    schemas.getTranscriptInput,
  );
  reg(
    "get_timed_transcript",
    "Get timed transcript segments with cursor pagination.",
    schemas.getTimedTranscriptInput,
  );
  reg(
    "get_transcript_chunk",
    "Get a transcript chunk by cursor with segment bounds.",
    schemas.getTranscriptChunkInput,
  );
  reg(
    "get_transcript_range",
    "Get transcript segments overlapping a time range in ms.",
    schemas.getTranscriptRangeInput,
  );
  reg(
    "list_available_languages",
    "List caption languages from yt-dlp metadata (resourceId or url).",
    schemas.listAvailableLanguagesInput,
  );
  reg(
    "extract_playlist",
    "Fetch playlist metadata and video items (no per-item transcript).",
    schemas.extractPlaylistInput,
  );
  reg(
    "extract_channel_latest",
    "Fetch latest channel uploads as video resources.",
    schemas.extractChannelLatestInput,
  );
  reg("create_list", "Create a new saved list.", schemas.createListInput);
  reg(
    "add_resource_to_list",
    "Add a resource to a list.",
    schemas.addResourceToListInput,
  );
  reg(
    "add_playlist_to_list",
    "Add a playlist (and optionally its videos) to a list.",
    schemas.addPlaylistToListInput,
  );
  reg(
    "get_list_contents",
    "Get list metadata and each item with resolved resource.",
    schemas.getListContentsInput,
  );
  reg("list_lists", "List all saved lists (id, name, updatedAt).", z.object({}));
  reg(
    "get_video_transcript_view",
    "MCP UI: video + timed transcript payload (YouTube embed + segments).",
    schemas.getVideoTranscriptViewInput,
  );
  reg(
    "get_list_view",
    "MCP UI: list + resources and transcript language tags.",
    schemas.getListViewInput,
  );
  reg(
    "get_job_status_view",
    "MCP UI: extraction job + optional resource metadata.",
    schemas.jobIdInput,
  );

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
