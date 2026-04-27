import { describe, expect, it } from "vitest";
import { xaiSttJsonToSegments } from "./index.js";

describe("xaiSttJsonToSegments", () => {
  it("maps word timestamps to segments", () => {
    const segs = xaiSttJsonToSegments({
      text: "a b",
      duration: 1,
      words: [
        { text: "a", start: 0, end: 0.2 },
        { text: "b", start: 0.2, end: 0.4 },
      ],
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]!.startMs).toBe(0);
    expect(segs[0]!.endMs).toBe(200);
  });

  it("falls back to full text when no words", () => {
    const segs = xaiSttJsonToSegments({ text: "hi", duration: 3.45 });
    expect(segs[0]!.endMs).toBe(3450);
  });
});
