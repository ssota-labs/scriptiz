import { describe, expect, it } from "vitest";
import { openAiVerboseJsonToSegments } from "./index.js";

describe("openAiVerboseJsonToSegments", () => {
  it("maps Whisper segments to TranscriptSegment", () => {
    const segs = openAiVerboseJsonToSegments({
      text: "Hello",
      duration: 1.2,
      segments: [
        { start: 0, end: 0.5, text: "Hel" },
        { start: 0.5, end: 1.1, text: "lo" },
      ],
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]!.startMs).toBe(0);
    expect(segs[0]!.endMs).toBe(500);
    expect(segs[1]!.text).toBe("lo");
  });

  it("single blob when no segments", () => {
    const segs = openAiVerboseJsonToSegments({ text: " only text ", duration: 2 });
    expect(segs).toHaveLength(1);
    expect(segs[0]!.endMs).toBe(2000);
  });
});
