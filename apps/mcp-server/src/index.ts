import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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

async function main() {
  const dataDir = dataDirFromEnv();
  const ctx = createScriptizMcpContext({
    dataDir,
    defaultLanguage: process.env.DEFAULT_LANGUAGE?.trim() || "en",
  });

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

  const t = new StdioServerTransport();
  await server.connect(t);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
