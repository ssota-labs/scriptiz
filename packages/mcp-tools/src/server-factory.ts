import {
  registerAppTool,
  type McpUiAppToolConfig,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ScriptizMcpContext } from "./context.js";
import { runScriptizTool } from "./handlers.js";
import { scriptizToolDescriptorMeta } from "./mcp-apps-constants.js";
import { registerScriptizMcpAppResource } from "./mcp-apps-resources.js";
import * as schemas from "./schemas.js";
import {
  buildScriptizWidgetView,
  summarizeToolForModel,
} from "./tool-structured-result.js";
import type { ToolErrorBody } from "./tool-result.js";

export const SCRIPTIZ_MCP_SERVER_NAME = "@scriptiz/mcp-server" as const;
export const SCRIPTIZ_MCP_SERVER_VERSION = "0.0.0" as const;

function isErr(r: unknown): r is ToolErrorBody {
  return (
    typeof r === "object" &&
    r !== null &&
    "ok" in r &&
    (r as { ok: boolean }).ok === false
  );
}

function wrapTool(ctx: ScriptizMcpContext, name: string) {
  return async (args: unknown) => {
    const out = await runScriptizTool(name, args, ctx);
    if (isErr(out)) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(out),
          },
        ],
        isError: true as const,
      };
    }
    const payload = out as Record<string, unknown>;
    const view = await buildScriptizWidgetView(ctx, name, payload);
    const text = summarizeToolForModel(name, payload);
    return {
      content: [{ type: "text" as const, text }],
      structuredContent: { tool: name, view },
    };
  };
}

const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: false,
};

const openWorldReadOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
};

const mutates: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true,
};

/**
 * Register all Scriptiz MCP tools on the given high-level server instance.
 * Used by the stdio binary and the hosted HTTP route (same tool surface).
 */
export function registerScriptizTools(
  server: McpServer,
  ctx: ScriptizMcpContext,
): void {
  const reg = (
    name: string,
    title: string,
    description: string,
    input: z.ZodType<unknown>,
    invoking: string,
    invoked: string,
    annotations: ToolAnnotations,
  ) => {
    registerAppTool(
      server,
      name,
      {
        title,
        description,
        inputSchema: input,
        annotations,
        _meta: scriptizToolDescriptorMeta(invoking, invoked) as McpUiAppToolConfig["_meta"],
      },
      wrapTool(ctx, name),
    );
  };

  reg(
    "extract_content",
    "Extract YouTube content",
    "Queue a YouTube video extraction job (metadata + captions).",
    schemas.extractContentInput,
    "Queueing extraction…",
    "Queued extraction job",
    mutates,
  );
  reg(
    "get_extraction_status",
    "Extraction job status",
    "Get extraction job status by job id.",
    schemas.jobIdInput,
    "Reading job…",
    "Job status ready",
    readOnly,
  );
  reg(
    "get_content",
    "Resource + transcript metadata",
    "Get resource and transcript language info.",
    schemas.getContentInput,
    "Loading resource…",
    "Resource loaded",
    readOnly,
  );
  reg(
    "get_transcript",
    "Transcript text",
    "Get transcript text (optionally with timestamps) with optional cursor continuation.",
    schemas.getTranscriptInput,
    "Loading transcript…",
    "Transcript ready",
    readOnly,
  );
  reg(
    "get_timed_transcript",
    "Timed transcript",
    "Get timed transcript segments with cursor pagination.",
    schemas.getTimedTranscriptInput,
    "Loading timed transcript…",
    "Timed transcript ready",
    readOnly,
  );
  reg(
    "get_transcript_chunk",
    "Transcript chunk",
    "Get a transcript chunk by cursor with segment bounds.",
    schemas.getTranscriptChunkInput,
    "Loading transcript chunk…",
    "Chunk ready",
    readOnly,
  );
  reg(
    "get_transcript_range",
    "Transcript by time range",
    "Get transcript segments overlapping a time range in ms.",
    schemas.getTranscriptRangeInput,
    "Loading range…",
    "Range ready",
    readOnly,
  );
  reg(
    "list_available_languages",
    "Caption languages",
    "List caption languages from yt-dlp metadata (resourceId or url).",
    schemas.listAvailableLanguagesInput,
    "Listing languages…",
    "Languages ready",
    openWorldReadOnly,
  );
  reg(
    "extract_playlist",
    "Fetch playlist",
    "Fetch playlist metadata and video items (no per-item transcript).",
    schemas.extractPlaylistInput,
    "Fetching playlist…",
    "Playlist ready",
    openWorldReadOnly,
  );
  reg(
    "extract_channel_latest",
    "Fetch channel uploads",
    "Fetch latest channel uploads as video resources.",
    schemas.extractChannelLatestInput,
    "Fetching channel…",
    "Channel items ready",
    openWorldReadOnly,
  );
  reg(
    "create_list",
    "Create list",
    "Create a new saved list.",
    schemas.createListInput,
    "Creating list…",
    "List created",
    mutates,
  );
  reg(
    "add_resource_to_list",
    "Add resource to list",
    "Add a resource to a list.",
    schemas.addResourceToListInput,
    "Updating list…",
    "Resource added",
    mutates,
  );
  reg(
    "add_playlist_to_list",
    "Add playlist to list",
    "Add a playlist (and optionally its videos) to a list.",
    schemas.addPlaylistToListInput,
    "Updating list…",
    "Playlist added",
    mutates,
  );
  reg(
    "get_list_contents",
    "List contents",
    "Get list metadata and each item with resolved resource.",
    schemas.getListContentsInput,
    "Loading list…",
    "List contents ready",
    readOnly,
  );
  reg(
    "list_lists",
    "List saved lists",
    "List all saved lists (id, name, updatedAt).",
    z.object({}),
    "Listing lists…",
    "Lists ready",
    readOnly,
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
  registerScriptizMcpAppResource(server);
  return server;
}
