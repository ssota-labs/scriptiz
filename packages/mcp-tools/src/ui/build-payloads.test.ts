import { describe, expect, it } from "vitest";
import { buildVideoTranscriptView, buildJobStatusView } from "./build-payloads.js";
import type { Resource, ExtractionJob } from "@scriptiz/schemas";

const videoResource: Resource = {
  id: "youtube_video_abc",
  type: "video",
  platform: "youtube",
  sourceUrl: "https://www.youtube.com/watch?v=abc",
  sourceId: "abc",
  title: "T",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("build-payloads", () => {
  it("buildVideoTranscriptView", () => {
    const v = buildVideoTranscriptView({
      resource: videoResource,
      language: "en",
      segments: [
        { index: 0, startMs: 0, endMs: 1000, text: "hi" },
      ],
    });
    expect(v.type).toBe("video_transcript_view");
    expect(v.video.provider).toBe("youtube");
    expect(v.transcript.segments).toHaveLength(1);
    expect(v.actions).toContain("save_to_list");
  });

  it("buildJobStatusView", () => {
    const job: ExtractionJob = {
      id: "job_1",
      sourceUrl: "https://www.youtube.com/watch?v=abc",
      kind: "video",
      status: "completed",
      allowSttFallback: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const v = buildJobStatusView({ job, resource: videoResource });
    expect(v.type).toBe("job_status_view");
    expect(v.job.id).toBe("job_1");
    expect(v.resource?.id).toBe("youtube_video_abc");
  });
});
