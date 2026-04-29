import { describe, it, expect } from "vitest";
import { extractionJobSchema, resourceSchema } from "./domain.js";

describe("resourceSchema", () => {
  it("accepts a minimal valid resource", () => {
    const r = resourceSchema.parse({
      id: "youtube_video_abc",
      type: "video",
      platform: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      sourceId: "abc",
      title: "T",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(r.id).toBe("youtube_video_abc");
  });
});

describe("extractionJobSchema", () => {
  it("accepts a queued job", () => {
    const j = extractionJobSchema.parse({
      id: "job_1",
      sourceUrl: "https://www.youtube.com/watch?v=x",
      kind: "video",
      status: "queued",
      allowSttFallback: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(j.status).toBe("queued");
  });
});
