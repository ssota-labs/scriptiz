import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ScriptizMcpContext } from "./context.js";
import { runScriptizTool } from "./handlers.js";
import * as schemas from "./schemas.js";

export const SCRIPTIZ_MCP_SERVER_NAME = "@scriptiz/mcp-server" as const;
export const SCRIPTIZ_MCP_SERVER_VERSION = "0.0.0" as const;

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

function wrapTool(ctx: ScriptizMcpContext, name: string) {
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

/**
 * Register all Scriptiz MCP tools on the given high-level server instance.
 * Used by the stdio binary and the hosted HTTP route (same tool surface).
 */
export function registerScriptizTools(
  server: McpServer,
  ctx: ScriptizMcpContext,
): void {
  const reg = (name: string, description: string, input: z.ZodType<unknown>) => {
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
}

/**
 * Create an {@link McpServer} with all Scriptiz tools bound to the given context
 * (local filesystem storage, or hosted Supabase-backed adapters).
 */
export function createScriptizMcpServer(ctx: ScriptizMcpContext): McpServer {
  const server = new McpServer(
    { name: SCRIPTIZ_MCP_SERVER_NAME, version: SCRIPTIZ_MCP_SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  registerScriptizTools(server, ctx);
  return server;
}
