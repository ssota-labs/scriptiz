const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** watch / shorts / youtu.be → 11자 video id */
export function parseYoutubeVideoId(raw: string): string | null {
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      return VIDEO_ID.test(id) ? id : null;
    }
    if (h === "youtube.com" || h === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v && VIDEO_ID.test(v)) {
        return v;
      }
      const shorts = u.pathname.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
      if (shorts?.[1]) {
        return shorts[1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function isLikelyPlaylistUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    const list = u.searchParams.get("list");
    return !!list && list.length > 2;
  } catch {
    return false;
  }
}

/** playlist가 아닌 일반 채널/사용자 URL로 간주 (watch v= 제외) */
export function isLikelyChannelTabUrl(raw: string): boolean {
  if (parseYoutubeVideoId(raw)) {
    return false;
  }
  if (isLikelyPlaylistUrl(raw)) {
    return false;
  }
  try {
    const u = new URL(raw);
    const h = u.hostname.replace(/^www\./, "");
    if (h !== "youtube.com" && h !== "m.youtube.com") {
      return false;
    }
    return (
      u.pathname.includes("/channel/") ||
      u.pathname.includes("/@") ||
      u.pathname.includes("/c/") ||
      u.pathname.includes("/user/") ||
      u.pathname.endsWith("/videos")
    );
  } catch {
    return false;
  }
}

export function ensureChannelVideosUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (!u.pathname.includes("/videos")) {
      u.pathname = u.pathname.replace(/\/?$/, "") + "/videos";
    }
    return u.toString();
  } catch {
    return raw;
  }
}
