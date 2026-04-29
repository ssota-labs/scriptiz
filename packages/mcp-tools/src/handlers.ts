import {
  decodeTranscriptCursor,
  encodeTranscriptCursor,
  joinSegmentTexts,
  makeResourceId,
  sliceSegmentsByTimeRange,
} from "@scriptiz/core";
import { YtDlpError } from "@scriptiz/extractor-ytdlp";
import { DuplicateRunningJobError } from "@scriptiz/ports";
import type {
  ExtractionJob,
  ExtractionJobStatus,
  TranscriptSegment,
} from "@scriptiz/schemas";
import { randomUUID } from "node:crypto";
import type { ScriptizMcpContext } from "./context.js";
import { listLanguageOptionsFromDump } from "./subtitle-list.js";
import {
  getTimedTranscriptSlice,
  loadTranscriptForResource,
} from "./transcript-internal.js";
import { toolErr } from "./tool-result.js";
import type { ToolErrorBody, ToolResult } from "./tool-result.js";
import {
  extractContentInput,
  getContentInput,
  getTimedTranscriptInput,
  getTranscriptChunkInput,
  getTranscriptInput,
  getTranscriptRangeInput,
  jobIdInput,
  listAvailableLanguagesInput,
} from "./schemas.js";
import { isStrictYouTubeVideoUrl, parseYoutubeVideoId } from "./youtube-url.js";

function nowIso() {
  return new Date().toISOString();
}

function isErr(r: ToolResult): r is ToolErrorBody {
  return "ok" in r && (r as ToolErrorBody).ok === false;
}

export async function handleExtractContent(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = extractContentInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { url, language, allowSttFallback, forceRefresh, uiLocale } =
    parsed.data;
  const vid = parseYoutubeVideoId(url);
  if (!vid || !isStrictYouTubeVideoUrl(url)) {
    return toolErr(
      "UNSUPPORTED_URL",
      "Not a supported YouTube video or Shorts watch URL",
      false,
    );
  }
  const resourceId = makeResourceId("video", vid);
  const requestedLang = language ?? ctx.defaultLanguage;
  const have = await ctx.storage.listTranscriptLanguageCodes(resourceId);
  if (!forceRefresh && have.includes(requestedLang)) {
    return {
      jobId: `already_extracted_${resourceId}`,
      status: "completed" as ExtractionJobStatus,
      resourceId,
      alreadyExtracted: true,
      ...(uiLocale ? { uiLocale } : {}),
    };
  }
  const job: ExtractionJob = {
    id: `job_${randomUUID()}`,
    resourceId,
    sourceUrl: url,
    kind: "video",
    status: "queued",
    allowSttFallback: allowSttFallback ?? false,
    language: requestedLang,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  try {
    await ctx.queue.enqueue(job);
  } catch (e) {
    if (e instanceof DuplicateRunningJobError) {
      return toolErr(
        "DUPLICATE_JOB",
        e.message,
        true,
        { resourceId, sourceUrl: url },
      );
    }
    throw e;
  }
  return {
    jobId: job.id,
    status: job.status,
    resourceId: job.resourceId,
    alreadyExtracted: false,
    ...(uiLocale ? { uiLocale } : {}),
  };
}

export async function handleGetExtractionStatus(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = jobIdInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const j = await ctx.queue.getJobById(parsed.data.jobId);
  if (!j) {
    return toolErr("JOB_NOT_FOUND", "No job with this id", false);
  }
  return {
    jobId: j.id,
    status: j.status,
    resourceId: j.resourceId,
    errorCode: j.errorCode,
    errorMessage: j.errorMessage,
    updatedAt: j.updatedAt,
    ...(parsed.data.uiLocale ? { uiLocale: parsed.data.uiLocale } : {}),
  };
}

export async function handleGetContent(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getContentInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const resource = await ctx.storage.getResourceById(parsed.data.resourceId);
  if (!resource) {
    return toolErr("NOT_FOUND", "Resource not in local storage", false);
  }
  const transcriptLanguages = await ctx.storage.listTranscriptLanguageCodes(
    parsed.data.resourceId,
  );
  let hasTimedTranscript = false;
  for (const lang of transcriptLanguages) {
    const t = await ctx.storage.getTranscript(parsed.data.resourceId, lang);
    if (t && t.segments.length > 0) {
      hasTimedTranscript = true;
      break;
    }
  }
  return {
    resource,
    transcriptLanguages,
    hasTimedTranscript,
  };
}

export async function handleGetTranscript(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getTranscriptInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { resourceId, includeTimestamps, maxSegments = 100 } = parsed.data;
  const loaded = await loadTranscriptForResource(
    ctx,
    resourceId,
    parsed.data.language,
  );
  if ("error" in loaded) {
    return loaded.error;
  }
  const { tr, language } = loaded;
  const all = tr.segments;
  const take = Math.min(maxSegments, all.length);
  const slice = all.slice(0, take);
  const text = joinSegmentTexts(slice);
  const out: Record<string, unknown> = {
    resourceId,
    language,
    text,
  };
  if (includeTimestamps) {
    out.segments = slice;
  }
  if (take < all.length) {
    out.nextCursor = encodeTranscriptCursor({
      resourceId,
      language,
      nextIndex: take,
    });
  }
  return out;
}

export async function handleGetTimedTranscript(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getTimedTranscriptInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { resourceId, cursor, limit = 100 } = parsed.data;
  const r = await getTimedTranscriptSlice(ctx, {
    resourceId,
    language: parsed.data.language,
    cursor,
    limit,
  });
  if ("error" in r) {
    return r.error;
  }
  const out: Record<string, unknown> = {
    resourceId: r.resourceId,
    language: r.language,
    segments: r.segments,
  };
  if (r.nextCursor) {
    out.nextCursor = r.nextCursor;
  }
  return out;
}

export async function handleGetTranscriptChunk(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getTranscriptChunkInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const {
    resourceId,
    cursor,
    limitSegments = 50,
    includeTimestamps = false,
  } = parsed.data;
  const loaded = await loadTranscriptForResource(
    ctx,
    resourceId,
    parsed.data.language,
  );
  if ("error" in loaded) {
    return loaded.error;
  }
  const { tr, language } = loaded;
  let start = 0;
  if (cursor) {
    try {
      const c = decodeTranscriptCursor(cursor);
      if (c.resourceId !== resourceId || c.language !== language) {
        return toolErr(
          "INVALID_CURSOR",
          "Cursor does not match resource/language",
          false,
        );
      }
      start = c.nextIndex;
    } catch (e) {
      return toolErr(
        "INVALID_CURSOR",
        e instanceof Error ? e.message : "Bad cursor",
        false,
      );
    }
  }
  const all = tr.segments;
  const end = Math.min(start + limitSegments, all.length);
  const slice = all.slice(start, end) as TranscriptSegment[];
  const text = joinSegmentTexts(slice);
  const out: Record<string, unknown> = {
    resourceId,
    language,
    startIndex: start,
    endIndex: end - 1,
    text,
  };
  if (cursor) {
    out.cursor = cursor;
  }
  if (end < all.length) {
    out.nextCursor = encodeTranscriptCursor({
      resourceId,
      language,
      nextIndex: end,
    });
  }
  if (includeTimestamps) {
    out.segments = slice;
  }
  return out;
}

export async function handleGetTranscriptRange(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getTranscriptRangeInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { resourceId, startMs, endMs } = parsed.data;
  if (endMs < startMs) {
    return toolErr("INVALID_RANGE", "endMs must be >= startMs", false);
  }
  const loaded = await loadTranscriptForResource(
    ctx,
    resourceId,
    parsed.data.language,
  );
  if ("error" in loaded) {
    return loaded.error;
  }
  const { tr, language } = loaded;
  const segments = sliceSegmentsByTimeRange(
    tr.segments,
    startMs,
    endMs,
  ) as TranscriptSegment[];
  return {
    resourceId,
    language,
    startMs,
    endMs,
    text: joinSegmentTexts(segments),
    segments,
  };
}

export async function handleListAvailableLanguages(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = listAvailableLanguagesInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { resourceId, url } = parsed.data;
  let targetUrl = url;
  if (resourceId) {
    const r = await ctx.storage.getResourceById(resourceId);
    if (!r) {
      return toolErr("NOT_FOUND", "Resource not in local storage", false);
    }
    targetUrl = r.sourceUrl;
  }
  if (!targetUrl) {
    return toolErr(
      "VALIDATION_ERROR",
      "Provide resourceId or url",
      false,
    );
  }
  if (!isStrictYouTubeVideoUrl(targetUrl)) {
    return toolErr(
      "UNSUPPORTED_URL",
      "Not a supported YouTube video or Shorts watch URL",
      false,
    );
  }
  try {
    const dump = await ctx.extractor.getMetadataDump(targetUrl);
    return { languages: listLanguageOptionsFromDump(dump) };
  } catch (e) {
    return mapYtdlpToToolErr(e);
  }
}

function mapYtdlpToToolErr(e: unknown): ToolErrorBody {
  if (e instanceof YtDlpError) {
    return toolErr(
      e.code,
      e.message,
      e.code === "VIDEO_UNAVAILABLE" ||
        e.code === "YTDLP_FAILED" ||
        e.code === "YTDLP_TIMEOUT",
    );
  }
  if (e instanceof Error) {
    return toolErr("INTERNAL", e.message, false);
  }
  return toolErr("INTERNAL", String(e), false);
}

/**
 * @returns MCP tool payload (성공 시 객체, 실패 시 `{ ok: false, error }`)
 */
export async function runScriptizTool(
  name: string,
  args: unknown,
  ctx: ScriptizMcpContext,
): Promise<unknown> {
  let r: ToolResult;
  switch (name) {
    case "extract_content":
      r = await handleExtractContent(ctx, args);
      break;
    case "get_extraction_status":
      r = await handleGetExtractionStatus(ctx, args);
      break;
    case "get_content":
      r = await handleGetContent(ctx, args);
      break;
    case "get_transcript":
      r = await handleGetTranscript(ctx, args);
      break;
    case "get_timed_transcript":
      r = await handleGetTimedTranscript(ctx, args);
      break;
    case "get_transcript_chunk":
      r = await handleGetTranscriptChunk(ctx, args);
      break;
    case "get_transcript_range":
      r = await handleGetTranscriptRange(ctx, args);
      break;
    case "list_available_languages":
      r = await handleListAvailableLanguages(ctx, args);
      break;
    default:
      r = toolErr("UNKNOWN_TOOL", `Unknown tool: ${name}`, false);
  }
  if (isErr(r)) {
    return r;
  }
  return r;
}
