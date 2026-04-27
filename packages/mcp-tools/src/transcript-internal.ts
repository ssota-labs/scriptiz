import {
  decodeTranscriptCursor,
  encodeTranscriptCursor,
} from "@scriptiz/core";
import type { Transcript, TranscriptSegment } from "@scriptiz/schemas";
import type { ScriptizMcpContext } from "./context.js";
import { toolErr } from "./tool-result.js";
import type { ToolErrorBody } from "./tool-result.js";

export async function loadTranscriptForResource(
  ctx: ScriptizMcpContext,
  resourceId: string,
  language: string | undefined,
): Promise<
  { tr: Transcript; language: string } | { error: ToolErrorBody }
> {
  const langs = await ctx.storage.listTranscriptLanguageCodes(resourceId);
  if (langs.length === 0) {
    return {
      error: toolErr(
        "NO_TRANSCRIPT",
        "No transcript for this resource",
        false,
      ),
    };
  }
  const lang =
    language && langs.includes(language)
      ? language
      : langs.includes(ctx.defaultLanguage)
        ? ctx.defaultLanguage
        : langs[0]!;
  const tr = await ctx.storage.getTranscript(resourceId, lang);
  if (!tr) {
    return {
      error: toolErr(
        "NO_TRANSCRIPT",
        "Transcript not found for language",
        false,
      ),
    };
  }
  return { tr, language: lang };
}

export async function getTimedTranscriptSlice(
  ctx: ScriptizMcpContext,
  input: {
    resourceId: string;
    language?: string;
    cursor?: string;
    limit: number;
  },
): Promise<
  | {
      resourceId: string;
      language: string;
      segments: TranscriptSegment[];
      nextCursor?: string;
    }
  | { error: ToolErrorBody }
> {
  const { resourceId, cursor, limit } = input;
  const loaded = await loadTranscriptForResource(
    ctx,
    resourceId,
    input.language,
  );
  if ("error" in loaded) {
    return loaded;
  }
  const { tr, language } = loaded;
  let start = 0;
  if (cursor) {
    try {
      const c = decodeTranscriptCursor(cursor);
      if (c.resourceId !== resourceId || c.language !== language) {
        return {
          error: toolErr(
            "INVALID_CURSOR",
            "Cursor does not match resource/language",
            false,
          ),
        };
      }
      start = c.nextIndex;
    } catch (e) {
      return {
        error: toolErr(
          "INVALID_CURSOR",
          e instanceof Error ? e.message : "Bad cursor",
          false,
        ),
      };
    }
  }
  const all = tr.segments;
  const slice = all.slice(start, start + limit);
  const out: {
    resourceId: string;
    language: string;
    segments: TranscriptSegment[];
    nextCursor?: string;
  } = {
    resourceId,
    language,
    segments: slice,
  };
  if (start + slice.length < all.length) {
    out.nextCursor = encodeTranscriptCursor({
      resourceId,
      language,
      nextIndex: start + slice.length,
    });
  }
  return out;
}
