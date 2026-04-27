import { describe, it, expect } from "vitest";
import { selectSubtitleTrack, captionSourceFromTrack } from "./subtitle-lang.js";

const dump = {
  subtitles: { en: [], ko: [] },
  automatic_captions: { es: [] },
};

describe("selectSubtitleTrack", () => {
  it("prefers exact language", () => {
    const t = selectSubtitleTrack(dump, "ko");
    expect(t?.language).toBe("ko");
    expect(t?.isAuto).toBe(false);
  });

  it("picks first manual if no match", () => {
    const t = selectSubtitleTrack(dump, "xx");
    expect(t).not.toBeNull();
  });

  it("captionSourceFromTrack", () => {
    expect(captionSourceFromTrack({ isAuto: true })).toBe("auto_caption");
    expect(captionSourceFromTrack({ isAuto: false })).toBe("native_caption");
  });
});
