import {
  addResourceToList,
  createUserList,
  decodeTranscriptCursor,
  encodeTranscriptCursor,
  joinSegmentTexts,
  makeResourceId,
  sliceSegmentsByTimeRange,
} from "@scriptiz/core";
import {
  mapChannelRootToResource,
  mapPlaylistRootToResource,
  mapVideoEntryToResource,
  YtDlpError,
} from "@scriptiz/extractor-ytdlp";
import { DuplicateRunningJobError } from "@scriptiz/ports";
import type {
  ExtractionJob,
  ExtractionJobStatus,
  Resource,
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
  addPlaylistToListInput,
  addResourceToListInput,
  createListInput,
  extractChannelLatestInput,
  extractContentInput,
  extractPlaylistInput,
  getContentInput,
  getListContentsInput,
  getTimedTranscriptInput,
  getTranscriptChunkInput,
  getTranscriptInput,
  getTranscriptRangeInput,
  jobIdInput,
  listAvailableLanguagesInput,
} from "./schemas.js";
import {
  handleGetJobStatusView,
  handleGetListView,
  handleGetVideoTranscriptView,
} from "./ui-handlers.js";
import {
  ensureChannelVideosUrl,
  isStrictYouTubeChannelOrTabUrl,
  isStrictYouTubePlaylistUrl,
  isStrictYouTubeVideoUrl,
  parseYoutubeVideoId,
  toStrictYouTubeUrl,
} from "./youtube-url.js";

function nowIso() {
  return new Date().toISOString();
}

function isErr(r: ToolResult): r is ToolErrorBody {
  return "ok" in r && (r as ToolErrorBody).ok === false;
}

function playlistEntries(dump: unknown): unknown[] {
  if (!dump || typeof dump !== "object") {
    return [];
  }
  const o = dump as { entries?: unknown };
  return Array.isArray(o.entries) ? o.entries : [];
}

function findPlaylistObject(parts: unknown[]): unknown {
  for (const p of parts) {
    if (!p || typeof p !== "object") {
      continue;
    }
    const o = p as { _type?: string; entries?: unknown };
    if (o._type === "playlist" || (Array.isArray(o.entries) && o.entries.length)) {
      return p;
    }
  }
  return parts[0] ?? null;
}

export async function handleExtractContent(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = extractContentInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { url, language, allowSttFallback, forceRefresh } = parsed.data;
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
        return toolErr("INVALID_CURSOR", "Cursor does not match resource/language", false);
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

export async function handleExtractPlaylist(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = extractPlaylistInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { url, maxItems = 200 } = parsed.data;
  if (!isStrictYouTubePlaylistUrl(url)) {
    return toolErr(
      "UNSUPPORTED_URL",
      "Not a supported YouTube playlist URL (add list= or use a playlist link)",
      false,
    );
  }
  try {
    const parts = await ctx.extractor.getMetadataDumpLines(url, {
      playlistEnd: maxItems,
    });
    const plDump = findPlaylistObject(parts);
    if (!plDump) {
      return toolErr("PARSE_FAILED", "Could not parse playlist from yt-dlp", false);
    }
    const t = nowIso();
    const { resource } = mapPlaylistRootToResource(plDump, t);
    await ctx.storage.putResource(resource);
    const rawEntries = playlistEntries(plDump);
    const items: Resource[] = [];
    for (const entry of rawEntries.slice(0, maxItems)) {
      try {
        const m = mapVideoEntryToResource(entry, t);
        await ctx.storage.putResource(m.resource);
        items.push(m.resource);
      } catch {
        // skip bad entries
      }
    }
    return {
      playlistResourceId: resource.id,
      title: resource.title,
      itemCount: items.length,
      items,
    };
  } catch (e) {
    return mapYtdlpToToolErr(e);
  }
}

export async function handleExtractChannelLatest(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = extractChannelLatestInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { maxItems = 20 } = parsed.data;
  const strict = toStrictYouTubeUrl(parsed.data.url);
  if (!strict) {
    return toolErr(
      "UNSUPPORTED_URL",
      "Not a supported YouTube channel, tab, or playlist URL",
      false,
    );
  }
  const url = ensureChannelVideosUrl(strict.toString());
  if (!isStrictYouTubeChannelOrTabUrl(url)) {
    return toolErr(
      "UNSUPPORTED_URL",
      "Expected a YouTube channel (/@.../videos, /channel/..., /c/...), or playlist URL",
      false,
    );
  }
  try {
    const parts = await ctx.extractor.getMetadataDumpLines(url, {
      playlistEnd: maxItems,
    });
    const root = parts[0] ?? null;
    if (!root) {
      return toolErr("PARSE_FAILED", "Empty yt-dlp response", false);
    }
    const t = nowIso();
    const { resource } = mapChannelRootToResource(
      root,
      t,
      url,
    );
    await ctx.storage.putResource(resource);
    const items: Resource[] = [];
    for (const entry of playlistEntries(root).slice(0, maxItems)) {
      try {
        const m = mapVideoEntryToResource(entry, t);
        await ctx.storage.putResource(m.resource);
        items.push(m.resource);
      } catch {
        // skip
      }
    }
    return {
      channelResourceId: resource.id,
      title: resource.title,
      items,
    };
  } catch (e) {
    return mapYtdlpToToolErr(e);
  }
}

export async function handleCreateList(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = createListInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const id = `list_${randomUUID()}`;
  const list = createUserList({
    id,
    name: parsed.data.name,
    description: parsed.data.description,
    now: nowIso(),
  });
  await ctx.storage.putList(list);
  return { listId: list.id, name: list.name, createdAt: list.createdAt };
}

export async function handleAddResourceToList(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = addResourceToListInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { listId, resourceId, note } = parsed.data;
  const list = await ctx.storage.getListById(listId);
  if (!list) {
    return toolErr("NOT_FOUND", "List not found", false);
  }
  const res = await ctx.storage.getResourceById(resourceId);
  if (!res) {
    return toolErr("NOT_FOUND", "Resource not found", false);
  }
  const itemId = `item_${randomUUID()}`;
  const next = addResourceToList(list, {
    itemId,
    resourceId,
    note,
    now: nowIso(),
  });
  await ctx.storage.putList(next);
  return { listId, itemId, resourceId };
}

export async function handleAddPlaylistToList(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = addPlaylistToListInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const { listId, playlistResourceId, includeItems = true } = parsed.data;
  const list = await ctx.storage.getListById(listId);
  if (!list) {
    return toolErr("NOT_FOUND", "List not found", false);
  }
  const pl = await ctx.storage.getResourceById(playlistResourceId);
  if (!pl || pl.type !== "playlist") {
    return toolErr("NOT_FOUND", "Playlist resource not found", false);
  }
  const itemId = `item_${randomUUID()}`;
  let next = addResourceToList(list, {
    itemId,
    resourceId: playlistResourceId,
    now: nowIso(),
  });
  if (includeItems) {
    if (!isStrictYouTubePlaylistUrl(pl.sourceUrl)) {
      return toolErr(
        "UNSUPPORTED_URL",
        "Playlist resource has a non-YouTube or unsupported sourceUrl",
        false,
      );
    }
    try {
      const parts = await ctx.extractor.getMetadataDumpLines(pl.sourceUrl, {
        playlistEnd: 5000,
      });
      const plDump = findPlaylistObject(parts);
      if (plDump) {
        const t = nowIso();
        for (const entry of playlistEntries(plDump)) {
          try {
            const m = mapVideoEntryToResource(entry, t);
            await ctx.storage.putResource(m.resource);
            const rid = `item_${randomUUID()}`;
            next = addResourceToList(next, {
              itemId: rid,
              resourceId: m.resource.id,
              now: nowIso(),
            });
          } catch {
            // skip
          }
        }
      }
    } catch (e) {
      return mapYtdlpToToolErr(e);
    }
  }
  await ctx.storage.putList(next);
  return { listId, playlistItemId: itemId, itemsAdded: includeItems };
}

export async function handleGetListContents(
  ctx: ScriptizMcpContext,
  raw: unknown,
): Promise<ToolResult> {
  const parsed = getListContentsInput.safeParse(raw);
  if (!parsed.success) {
    return toolErr("VALIDATION_ERROR", parsed.error.message, false);
  }
  const list = await ctx.storage.getListById(parsed.data.listId);
  if (!list) {
    return toolErr("NOT_FOUND", "List not found", false);
  }
  const itemDetails: Array<{
    item: (typeof list.items)[0];
    resource: Resource | null;
  }> = [];
  for (const item of list.items) {
    const resource = await ctx.storage.getResourceById(item.resourceId);
    itemDetails.push({ item, resource });
  }
  return { list, items: itemDetails };
}

export async function handleListLists(
  ctx: ScriptizMcpContext,
): Promise<ToolResult> {
  const ids = await ctx.storage.listIds();
  const lists: { id: string; name: string; updatedAt: string }[] = [];
  for (const id of ids) {
    const l = await ctx.storage.getListById(id);
    if (l) {
      lists.push({ id: l.id, name: l.name, updatedAt: l.updatedAt });
    }
  }
  return { lists };
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
    case "extract_playlist":
      r = await handleExtractPlaylist(ctx, args);
      break;
    case "extract_channel_latest":
      r = await handleExtractChannelLatest(ctx, args);
      break;
    case "create_list":
      r = await handleCreateList(ctx, args);
      break;
    case "add_resource_to_list":
      r = await handleAddResourceToList(ctx, args);
      break;
    case "add_playlist_to_list":
      r = await handleAddPlaylistToList(ctx, args);
      break;
    case "get_list_contents":
      r = await handleGetListContents(ctx, args);
      break;
    case "list_lists":
      r = await handleListLists(ctx);
      break;
    case "get_video_transcript_view":
      r = await handleGetVideoTranscriptView(ctx, args);
      break;
    case "get_list_view":
      r = await handleGetListView(ctx, args);
      break;
    case "get_job_status_view":
      r = await handleGetJobStatusView(ctx, args);
      break;
    default:
      r = toolErr("UNKNOWN_TOOL", `Unknown tool: ${name}`, false);
  }
  if (isErr(r)) {
    return r;
  }
  return r;
}
