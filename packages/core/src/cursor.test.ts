import { describe, it, expect } from "vitest";
import {
  decodeTranscriptCursor,
  encodeTranscriptCursor,
} from "./cursor.js";

describe("transcript cursor", () => {
  it("round-trips", () => {
    const payload = {
      resourceId: "youtube_video_x",
      language: "ko",
      nextIndex: 12,
    };
    const enc = encodeTranscriptCursor(payload);
    expect(decodeTranscriptCursor(enc)).toEqual(payload);
  });

  it("rejects bad cursor", () => {
    expect(() => decodeTranscriptCursor("not-base64!!!")).toThrow();
  });
});
