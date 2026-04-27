import { makeResourceId } from "@scriptiz/core";
import type { Resource } from "@scriptiz/schemas";
import { YtDlpError } from "./ytdlp-error.js";

function pickThumb(o: Record<string, unknown>): string | undefined {
  if (typeof o.thumbnail === "string" && o.thumbnail.length) {
    return o.thumbnail;
  }
  const th = o.thumbnails;
  if (Array.isArray(th) && th.length) {
    const last = th[th.length - 1] as Record<string, unknown> | string;
    if (typeof last === "object" && last && "url" in last) {
      return String(last.url);
    }
  }
  return undefined;
}

function uploadDateToIso(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length < 8) {
    return undefined;
  }
  const y = raw.slice(0, 4);
  const mo = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), 0, 0, 0, 0);
  if (Number.isNaN(t)) {
    return undefined;
  }
  return new Date(t).toISOString();
}

/**
 * `yt-dlp` 단일 video dump-json 1건만 처리.
 */
export function mapVideoDumpToResource(
  dump: unknown,
  nowIso: string,
): { resource: Resource; youtubeId: string } {
  if (!dump || typeof dump !== "object") {
    throw new YtDlpError("PARSE_FAILED", "dump-json: not an object");
  }
  const o = dump as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new YtDlpError("PARSE_FAILED", "dump-json: missing or invalid id");
  }
  const title = o.title;
  if (typeof title !== "string") {
    throw new YtDlpError("PARSE_FAILED", "dump-json: missing title");
  }
  const web = o.webpage_url;
  const sourceUrl =
    typeof web === "string" && web.length
      ? web
      : `https://www.youtube.com/watch?v=${id}`;
  const desc =
    typeof o.description === "string" ? o.description : undefined;
  const uploader =
    typeof o.uploader === "string" ? o.uploader : undefined;
  const ch =
    o.channel_id ?? o.uploader_id ?? o.channel;
  const ownerSourceId =
    typeof ch === "string" && ch.length ? ch : undefined;
  const duration =
    typeof o.duration === "number" && o.duration >= 0
      ? Math.floor(o.duration)
      : undefined;
  const pub =
    o.upload_date ?? o.release_date;
  const publishedAt = uploadDateToIso(pub) ?? undefined;
  const resource: Resource = {
    id: makeResourceId("video", id),
    type: "video",
    platform: "youtube",
    sourceUrl,
    sourceId: id,
    title,
    description: desc,
    ownerName: uploader,
    ownerSourceId,
    durationSeconds: duration,
    thumbnailUrl: pickThumb(o),
    publishedAt,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { resource, youtubeId: id };
}
