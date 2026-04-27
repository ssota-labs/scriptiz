const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
]);

/**
 * Parse URL, require http(s), no embedded credentials, host must be a known YouTube host.
 * Returns `null` if the URL must not be passed to yt-dlp from MCP tools.
 */
export function toStrictYouTubeUrl(raw: string): URL | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return null;
  }
  if (u.username || u.password) {
    return null;
  }
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  if (!ALLOWED_YOUTUBE_HOSTS.has(h)) {
    return null;
  }
  return u;
}

/**
 * @returns video id, or `null` if this is not a supported watch/shorts/yout.be URL
 */
export function parseYoutubeVideoId(raw: string): string | null {
  const strict = toStrictYouTubeUrl(raw);
  if (!strict) {
    return null;
  }
  return parseYoutubeVideoIdFromAllowedUrl(strict);
}

/** Assumes `u` was returned by `toStrictYouTubeUrl`. */
function parseYoutubeVideoIdFromAllowedUrl(u: URL): string | null {
  const h = u.hostname.toLowerCase().replace(/^www\./, "");
  if (h === "youtu.be") {
    const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com") {
    const v = u.searchParams.get("v");
    if (v && VIDEO_ID.test(v)) {
      return v;
    }
    const shorts = u.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
    if (shorts?.[1]) {
      return shorts[1];
    }
  }
  return null;
}

/** Video watch / shorts / youtu.be only — for `extract_content` and language listing by URL. */
export function isStrictYouTubeVideoUrl(raw: string): boolean {
  const u = toStrictYouTubeUrl(raw);
  if (!u) {
    return false;
  }
  return parseYoutubeVideoIdFromAllowedUrl(u) != null;
}

export function isLikelyPlaylistUrl(raw: string): boolean {
  const u = toStrictYouTubeUrl(raw);
  if (!u) {
    return false;
  }
  const list = u.searchParams.get("list");
  return !!list && list.length > 2;
}

/**
 * Playlist: strict host + `list=` (YouTube list id).
 * Optional `v=` is allowed on mix-style URLs.
 */
export function isStrictYouTubePlaylistUrl(raw: string): boolean {
  return isLikelyPlaylistUrl(raw);
}

/** playlist가 아닌 일반 채널/사용자 URL로 간주 (watch v= 제외) */
export function isLikelyChannelTabUrl(raw: string): boolean {
  const u = toStrictYouTubeUrl(raw);
  if (!u) {
    return false;
  }
  if (parseYoutubeVideoIdFromAllowedUrl(u)) {
    return false;
  }
  if (isLikelyPlaylistUrl(raw)) {
    return false;
  }
  return (
    u.pathname.includes("/channel/") ||
    u.pathname.includes("/@") ||
    u.pathname.includes("/c/") ||
    u.pathname.includes("/user/") ||
    u.pathname.endsWith("/videos")
  );
}

/**
 * Channel latest / channel playlist: same host; tab-style path or `list=`, not a lone video watch URL.
 */
export function isStrictYouTubeChannelOrTabUrl(
  urlAfterEnsure: string,
): boolean {
  if (isStrictYouTubePlaylistUrl(urlAfterEnsure)) {
    return true;
  }
  if (isLikelyChannelTabUrl(urlAfterEnsure)) {
    return true;
  }
  return false;
}

export function ensureChannelVideosUrl(raw: string): string {
  try {
    const u = toStrictYouTubeUrl(raw);
    if (!u) {
      return raw;
    }
    if (!u.pathname.includes("/videos")) {
      u.pathname = u.pathname.replace(/\/?$/, "") + "/videos";
    }
    return u.toString();
  } catch {
    return raw;
  }
}
