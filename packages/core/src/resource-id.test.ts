import { describe, it, expect } from "vitest";
import { makeResourceId, makeTranscriptId } from "./resource-id.js";

describe("makeResourceId", () => {
  it("builds platform_type_sourceId", () => {
    expect(makeResourceId("video", "dQw4w9WgXcQ")).toBe(
      "youtube_video_dQw4w9WgXcQ",
    );
  });

  it("rejects path-like source ids", () => {
    expect(() => makeResourceId("video", "a/b")).toThrow();
  });
});

describe("makeTranscriptId", () => {
  it("appends language", () => {
    expect(
      makeTranscriptId("youtube_video_dQw4w9WgXcQ", "ko"),
    ).toBe("youtube_video_dQw4w9WgXcQ_ko");
  });
});
