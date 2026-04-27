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

const ID_LOOSE = /^[A-Za-z0-9._-]+$/;

/**
 * playlist / flat playlist entry가 아닌 단일 video 엔트리(메타가 일부만 있어도 됨).
 */
export function mapVideoEntryToResource(
  entry: unknown,
  nowIso: string,
): { resource: Resource; youtubeId: string } {
  if (!entry || typeof entry !== "object") {
    throw new YtDlpError("PARSE_FAILED", "video entry: not an object");
  }
  const o = entry as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !ID_LOOSE.test(id)) {
    throw new YtDlpError("PARSE_FAILED", "video entry: missing id");
  }
  const title =
    typeof o.title === "string" && o.title.length
      ? o.title
      : "YouTube video";
  const web = o.webpage_url ?? o.url;
  const sourceUrl =
    typeof web === "string" && web.length
      ? web
      : `https://www.youtube.com/watch?v=${id}`;
  const uploader = typeof o.uploader === "string" ? o.uploader : undefined;
  const ch = o.channel_id ?? o.uploader_id;
  const ownerSourceId =
    typeof ch === "string" && ch.length ? ch : undefined;
  const duration =
    typeof o.duration === "number" && o.duration >= 0
      ? Math.floor(o.duration)
      : undefined;
  const pub = o.upload_date ?? o.release_date;
  const resource: Resource = {
    id: makeResourceId("video", id),
    type: "video",
    platform: "youtube",
    sourceUrl,
    sourceId: id,
    title,
    description:
      typeof o.description === "string" ? o.description : undefined,
    ownerName: uploader,
    ownerSourceId,
    durationSeconds: duration,
    thumbnailUrl: pickThumb(o),
    publishedAt: uploadDateToIso(pub) ?? undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { resource, youtubeId: id };
}

export function mapPlaylistRootToResource(
  dump: unknown,
  nowIso: string,
): { resource: Resource; playlistId: string } {
  if (!dump || typeof dump !== "object") {
    throw new YtDlpError("PARSE_FAILED", "playlist dump: not an object");
  }
  const o = dump as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== "string" || !ID_LOOSE.test(id)) {
    throw new YtDlpError("PARSE_FAILED", "playlist dump: invalid id");
  }
  const title =
    typeof o.title === "string" && o.title.length ? o.title : "Playlist";
  const web = o.webpage_url ?? o.webpage;
  const sourceUrl =
    typeof web === "string" && web.length
      ? web
      : `https://www.youtube.com/playlist?list=${id}`;
  const resource: Resource = {
    id: makeResourceId("playlist", id),
    type: "playlist",
    platform: "youtube",
    sourceUrl,
    sourceId: id,
    title,
    description: typeof o.description === "string" ? o.description : undefined,
    ownerName: typeof o.uploader === "string" ? o.uploader : undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { resource, playlistId: id };
}

export function mapChannelRootToResource(
  dump: unknown,
  nowIso: string,
  inputUrl: string,
): { resource: Resource; channelId: string } {
  if (!dump || typeof dump !== "object") {
    throw new YtDlpError("PARSE_FAILED", "channel dump: not an object");
  }
  const o = dump as Record<string, unknown>;
  const entries = o.entries;
  const first = Array.isArray(entries) && entries[0] ? (entries[0] as Record<string, unknown>) : null;
  const ch =
    (typeof o.channel_id === "string" && o.channel_id) ||
    (first && typeof first.channel_id === "string" && first.channel_id) ||
    (typeof o.id === "string" ? o.id : "");
  if (!ch || !ID_LOOSE.test(ch)) {
    throw new YtDlpError("PARSE_FAILED", "channel dump: could not determine channel_id");
  }
  const title =
    typeof o.title === "string" && o.title.length
      ? o.title
      : typeof o.uploader === "string"
        ? o.uploader
        : "YouTube channel";
  const resource: Resource = {
    id: makeResourceId("channel", ch),
    type: "channel",
    platform: "youtube",
    sourceUrl: inputUrl,
    sourceId: ch,
    title,
    description: typeof o.description === "string" ? o.description : undefined,
    ownerName: typeof o.uploader === "string" ? o.uploader : undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { resource, channelId: ch };
}
