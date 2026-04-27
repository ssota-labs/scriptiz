import { describe, it, expect } from "vitest";
import {
  joinSegmentTexts,
  sliceSegmentsByTimeRange,
} from "./transcript-range.js";
import type { TranscriptSegment } from "@scriptiz/schemas";

const segments: TranscriptSegment[] = [
  { index: 0, startMs: 0, endMs: 1000, text: "a" },
  { index: 1, startMs: 1000, endMs: 2000, text: "b" },
  { index: 2, startMs: 2000, endMs: 3000, text: "c" },
];

describe("sliceSegmentsByTimeRange", () => {
  it("returns overlapping only", () => {
    const s = sliceSegmentsByTimeRange(segments, 500, 1500);
    expect(s.map((x) => x.index)).toEqual([0, 1]);
  });

  it("rejects invalid range", () => {
    expect(() => sliceSegmentsByTimeRange(segments, 100, 50)).toThrow();
  });
});

describe("joinSegmentTexts", () => {
  it("joins with spaces", () => {
    expect(joinSegmentTexts(segments)).toBe("a b c");
  });
});
