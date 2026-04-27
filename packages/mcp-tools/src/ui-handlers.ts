import {
  buildJobStatusView,
  buildListView,
  buildVideoTranscriptView,
} from "@scriptiz/mcp-ui";
import type { ScriptizMcpContext } from "./context.js";
import {
  getListViewInput,
  getVideoTranscriptViewInput,
  jobIdInput,
} from "./schemas.js";
import { getTimedTranscriptSlice } from "./transcript-internal.js";
import { toolErr } from "./tool-result.js";
import type { ToolResult } from "./tool-result.js";

export async function handleGetVideoTranscriptView(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getVideoTranscriptViewInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { resourceId, language, cursor, limit = 500 } = parsed.data;
  const resource = await ctx.storage.getResourceById(resourceId);
  if (!resource) {
    return toolErr("NOT_FOUND", "Resource not in local storage", false);
  }
  if (resource.type !== "video") {
    return toolErr(
      "INVALID_RESOURCE",
      "MCP UI transcript view requires a video resource",
      false,
    );
  }
  const slice = await getTimedTranscriptSlice(ctx, {
    resourceId,
    language,
    cursor,
    limit,
  });
  if ("error" in slice) {
    return slice.error;
  }
  try {
    return buildVideoTranscriptView({
      resource,
      language: slice.language,
      segments: slice.segments,
      nextCursor: slice.nextCursor,
    }) as ToolResult;
  } catch (e) {
    return toolErr(
      "BUILD_UI_PAYLOAD",
      e instanceof Error ? e.message : String(e),
      false,
    );
  }
}

export async function handleGetListView(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getListViewInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const list = await ctx.storage.getListById(parsed.data.listId);
  if (!list) {
    return toolErr("NOT_FOUND", "List not found", false);
  }
  const items: Array<{
    resource: NonNullable<Awaited<ReturnType<typeof ctx.storage.getResourceById>>>;
    transcriptLanguages: string[];
  }> = [];
  for (const li of list.items) {
    const resource = await ctx.storage.getResourceById(li.resourceId);
    if (!resource) {
      continue;
    }
    const transcriptLanguages =
      await ctx.storage.listTranscriptLanguageCodes(li.resourceId);
    items.push({ resource, transcriptLanguages });
  }
  return buildListView({ list, items }) as ToolResult;
}

export async function handleGetJobStatusView(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = jobIdInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const job = await ctx.queue.getJobById(parsed.data.jobId);
  if (!job) {
    return toolErr("JOB_NOT_FOUND", "No job with this id", false);
  }
  const resource = job.resourceId
    ? await ctx.storage.getResourceById(job.resourceId)
    : undefined;
  return buildJobStatusView({
    job,
    ...(resource ? { resource } : {}),
  }) as ToolResult;
}
