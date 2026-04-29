import { describe, expect, it } from "vitest";
import {
  YtDlpExtractor,
  mapVideoDumpToResource,
} from "@scriptiz/extractor-ytdlp";

/**
 * Live verification (yt-dlp + YouTube). Opt-in so CI stays offline.
 *
 * Test plan:
 * 1. Run `yt-dlp --dump-json --skip-download` on a stable public video URL.
 * 2. Assert the raw JSON includes a non-empty `thumbnails` list with HTTP URLs
 *    (yt-dlp’s source for best video poster).
 * 3. Map with `mapVideoDumpToResource` and assert `thumbnailUrl` is set.
 * 4. GET the mapped video poster URL — expect 200 and an image/* (or octet-stream) body.
 * 5. Channel profile: if `ownerThumbnailUrl` is present, GET must succeed; if absent, skip
 *    (current yt-dlp builds often omit `uploader_avatar_url` / channel thumb on **video**
 *    info JSON — only video frame thumbs appear in `thumbnails[]`).
 *
 * Run:
 *   RUN_YTDLP_THUMB_LIVE=1 pnpm exec vitest run tests/integration/ytdlp-thumbnails-live.test.ts
 * Optional:
 *   YTDLP_LIVE_VIDEO_URL='https://www.youtube.com/watch?v=...' ...
 */
const LIVE = process.env.RUN_YTDLP_THUMB_LIVE === "1";
const VIDEO_URL =
  process.env.YTDLP_LIVE_VIDEO_URL?.trim() ||
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function expectUrlLoadsAsImage(url: string, label: string): Promise<void> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "ScriptizYtdlpThumbLive/1.0" },
  });
  expect(res.ok, `${label}: GET ${res.status} ${url}`).toBe(true);
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  expect(
    ct.includes("image") ||
      ct.includes("octet-stream") ||
      ct.includes("webp"),
    `${label}: unexpected Content-Type: ${ct || "(empty)"}`,
  ).toBe(true);
}

describe("yt-dlp live: video + channel images", () => {
  it.skipIf(!LIVE)("dump has video thumbnails; mapped poster is fetchable", async () => {
    const ex = new YtDlpExtractor();
    const dump = await ex.getYoutubeMetadataDump(VIDEO_URL);
    expect(dump && typeof dump === "object").toBe(true);
    const o = dump as Record<string, unknown>;
    const list = o.thumbnails;
    expect(Array.isArray(list), "thumbnails must be an array").toBe(true);
    expect((list as unknown[]).length).toBeGreaterThan(0);
    const httpCount = (list as unknown[]).filter((item) => {
      if (!item || typeof item !== "object") return false;
      const u = (item as Record<string, unknown>).url;
      return typeof u === "string" && u.startsWith("http");
    }).length;
    expect(httpCount).toBeGreaterThan(0);

    const now = new Date().toISOString();
    const { resource } = mapVideoDumpToResource(dump, now);
    expect(resource.thumbnailUrl, "mapped thumbnailUrl").toMatch(/^https?:\/\//);
    await expectUrlLoadsAsImage(resource.thumbnailUrl!, "video poster");
  });

  it.skipIf(!LIVE)("channel avatar when yt-dlp provides ownerThumbnailUrl", async () => {
    const ex = new YtDlpExtractor();
    const dump = await ex.getYoutubeMetadataDump(VIDEO_URL);
    const now = new Date().toISOString();
    const { resource } = mapVideoDumpToResource(dump, now);

    if (!resource.ownerThumbnailUrl) {
      // Observed with yt-dlp 2026.03.x + default YouTube extractor: video JSON often has
      // no uploader_avatar_url / channel thumb; thumbnails[] is video frames only.
      expect(resource.ownerThumbnailUrl).toBeUndefined();
      return;
    }

    expect(resource.ownerThumbnailUrl).toMatch(/^https?:\/\//);
    await expectUrlLoadsAsImage(
      resource.ownerThumbnailUrl,
      "channel / uploader avatar",
    );
  });
});
