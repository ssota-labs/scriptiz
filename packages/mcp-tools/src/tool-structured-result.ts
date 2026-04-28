import type { Resource, TranscriptSegment, UserList } from "@scriptiz/schemas";
import type { ScriptizMcpContext } from "./context.js";
import {
  buildJobStatusView,
  buildListView,
  buildVideoTranscriptView,
} from "./ui/build-payloads.js";
import {
  genericToolViewSchema,
  type GenericToolView,
  type JobStatusView,
  type ListView,
  type VideoTranscriptView,
} from "./ui/payload-schemas.js";

export type ScriptizWidgetView =
  | VideoTranscriptView
  | ListView
  | JobStatusView
  | GenericToolView;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isTranscriptSegmentArray(x: unknown): x is TranscriptSegment[] {
  if (!Array.isArray(x) || x.length === 0) {
    return false;
  }
  for (const s of x) {
    if (!isRecord(s)) {
      return false;
    }
    if (
      typeof s.index !== "number" ||
      typeof s.startMs !== "number" ||
      typeof s.endMs !== "number" ||
      typeof s.text !== "string"
    ) {
      return false;
    }
  }
  return true;
}

async function videoViewFromSegments(
  ctx: ScriptizMcpContext,
  resourceId: string,
  language: string,
  segments: TranscriptSegment[],
  nextCursor: string | undefined,
): Promise<VideoTranscriptView | null> {
  const resource = await ctx.storage.getResourceById(resourceId);
  if (!resource || resource.type !== "video") {
    return null;
  }
  return buildVideoTranscriptView({
    resource,
    language,
    segments,
    ...(nextCursor ? { nextCursor } : {}),
  });
}

async function jobViewFromPayload(
  ctx: ScriptizMcpContext,
  payload: Record<string, unknown>,
): Promise<JobStatusView | null> {
  const jobId = payload.jobId;
  if (typeof jobId !== "string" || !jobId.length) {
    return null;
  }
  const job = await ctx.queue.getJobById(jobId);
  if (!job) {
    return null;
  }
  let resource: Resource | undefined;
  if (job.resourceId) {
    resource = (await ctx.storage.getResourceById(job.resourceId)) ?? undefined;
  }
  return buildJobStatusView({ job, resource });
}

/**
 * Maps a successful tool JSON payload to the discriminated view the MCP App iframe renders.
 */
export async function buildScriptizWidgetView(
  ctx: ScriptizMcpContext,
  toolName: string,
  payload: Record<string, unknown>,
): Promise<ScriptizWidgetView> {
  const nextCursor =
    typeof payload.nextCursor === "string" ? payload.nextCursor : undefined;

  switch (toolName) {
    case "get_timed_transcript":
    case "get_transcript_range": {
      const resourceId = payload.resourceId;
      const language = payload.language;
      const segments = payload.segments;
      if (
        typeof resourceId === "string" &&
        typeof language === "string" &&
        isTranscriptSegmentArray(segments)
      ) {
        const v = await videoViewFromSegments(
          ctx,
          resourceId,
          language,
          segments,
          nextCursor,
        );
        if (v) {
          return v;
        }
      }
      break;
    }
    case "get_transcript":
    case "get_transcript_chunk": {
      const resourceId = payload.resourceId;
      const language = payload.language;
      const segments = payload.segments;
      if (
        typeof resourceId === "string" &&
        typeof language === "string" &&
        isTranscriptSegmentArray(segments)
      ) {
        const v = await videoViewFromSegments(
          ctx,
          resourceId,
          language,
          segments,
          nextCursor,
        );
        if (v) {
          return v;
        }
      }
      break;
    }
    case "get_list_contents": {
      const list = payload.list;
      const rawItems = payload.items;
      if (isRecord(list) && Array.isArray(rawItems)) {
        const items: ListView["items"] = [];
        for (const row of rawItems) {
          if (!isRecord(row)) {
            continue;
          }
          const resource = row.resource as Resource | null | undefined;
          if (!resource) {
            continue;
          }
          const transcriptLanguages = await ctx.storage.listTranscriptLanguageCodes(
            resource.id,
          );
          items.push({
            resource,
            transcriptLanguages,
          });
        }
        return buildListView({
          list: list as UserList,
          items,
        });
      }
      break;
    }
    case "get_extraction_status":
    case "extract_content": {
      const v = await jobViewFromPayload(ctx, payload);
      if (v) {
        return v;
      }
      break;
    }
    default:
      break;
  }

  return genericToolViewSchema.parse({
    type: "generic_tool_view",
    tool: toolName,
    payload,
  });
}

export function summarizeToolForModel(
  toolName: string,
  payload: Record<string, unknown>,
): string {
  switch (toolName) {
    case "get_timed_transcript":
    case "get_transcript":
    case "get_transcript_chunk":
    case "get_transcript_range": {
      const n = Array.isArray(payload.segments) ? payload.segments.length : 0;
      return `${toolName}: resource ${payload.resourceId}, language ${payload.language}, ${n} segment(s).`;
    }
    case "get_list_contents": {
      const list = payload.list as { name?: string; items?: unknown[] } | undefined;
      const n = Array.isArray(list?.items) ? list.items.length : 0;
      return `get_list_contents: "${list?.name ?? "list"}" (${n} item(s)).`;
    }
    case "get_extraction_status":
    case "extract_content":
      return `${toolName}: job ${payload.jobId}, status ${payload.status}.`;
    case "get_content":
      return `resource ${payload.resourceId}: timed transcript ${payload.hasTimedTranscript === true ? "yes" : "no"}.`;
    case "list_lists":
      return `lists: ${Array.isArray((payload as { lists?: unknown[] }).lists) ? (payload as { lists: unknown[] }).lists.length : 0} total.`;
    default:
      return `${toolName} completed.`;
  }
}
