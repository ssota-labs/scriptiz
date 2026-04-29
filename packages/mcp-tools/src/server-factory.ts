import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { ServerNotification, ServerRequest } from "@modelcontextprotocol/sdk/types.js";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { z, ZodRawShape } from "zod";
import type { ScriptizMcpContext } from "./context.js";
import { runScriptizTool } from "./handlers.js";
import * as schemas from "./schemas.js";
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
  return async (
    args: unknown,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ) => {
    void extra;
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
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(out) },
      ],
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
    input: z.ZodObject<ZodRawShape>,
    annotations: ToolAnnotations,
  ) => {
    server.registerTool(
      name,
      {
        title,
        description,
        inputSchema: input.shape,
        annotations,
      },
      wrapTool(ctx, name),
    );
  };

  reg(
    "extract_content",
    "Extract YouTube content",
    "Queue a YouTube video extraction job (metadata + captions). Only single-video / Shorts URLs are supported.",
    schemas.extractContentInput,
    mutates,
  );
  reg(
    "get_extraction_status",
    "Extraction job status",
    "Get extraction job status by job id.",
    schemas.jobIdInput,
    readOnly,
  );
  reg(
    "get_content",
    "Resource + transcript metadata",
    "Get resource and transcript language info.",
    schemas.getContentInput,
    readOnly,
  );
  reg(
    "get_transcript",
    "Transcript text",
    "Get transcript text (optionally with timestamps) with optional cursor continuation.",
    schemas.getTranscriptInput,
    readOnly,
  );
  reg(
    "get_timed_transcript",
    "Timed transcript",
    "Get timed transcript segments with cursor pagination.",
    schemas.getTimedTranscriptInput,
    readOnly,
  );
  reg(
    "get_transcript_chunk",
    "Transcript chunk",
    "Get a transcript chunk by cursor with segment bounds.",
    schemas.getTranscriptChunkInput,
    readOnly,
  );
  reg(
    "get_transcript_range",
    "Transcript by time range",
    "Get transcript segments overlapping a time range in ms.",
    schemas.getTranscriptRangeInput,
    readOnly,
  );
  reg(
    "list_available_languages",
    "Caption languages",
    "List caption languages from yt-dlp metadata (resourceId or url).",
    schemas.listAvailableLanguagesInput,
    openWorldReadOnly,
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
