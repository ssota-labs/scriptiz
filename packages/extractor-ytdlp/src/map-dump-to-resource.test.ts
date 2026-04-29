import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { mapVideoDumpToResource } from "./map-dump-to-resource.js";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("mapVideoDumpToResource", () => {
  it("maps yt-dlp dump to Resource", async () => {
    const raw = await readFile(
      path.join(here, "fixtures", "video-dump.min.json"),
      "utf8",
    );
    const dump = JSON.parse(raw) as unknown;
    const { resource, youtubeId } = mapVideoDumpToResource(
      dump,
      "2026-01-01T00:00:00.000Z",
    );
    expect(youtubeId).toBe("dQw4w9WgXcQ");
    expect(resource.id).toBe("youtube_video_dQw4w9WgXcQ");
    expect(resource.type).toBe("video");
    expect(resource.platform).toBe("youtube");
    expect(resource.ownerThumbnailUrl).toBe(
      "https://yt3.googleusercontent.com/ytc/sample=s88-c-k-c0x00ffffff-no-rj",
    );
    expect(resource.thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    );
  });
});
