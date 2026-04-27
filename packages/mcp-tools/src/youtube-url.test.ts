import { describe, expect, it } from "vitest";
import {
  isStrictYouTubeChannelOrTabUrl,
  isStrictYouTubePlaylistUrl,
  isStrictYouTubeVideoUrl,
  parseYoutubeVideoId,
  toStrictYouTubeUrl,
} from "./youtube-url.js";

describe("strict YouTube URLs", () => {
  it("rejects non-http(s) and unknown hosts", () => {
    expect(toStrictYouTubeUrl("file:///etc/passwd")).toBeNull();
    expect(toStrictYouTubeUrl("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(
      toStrictYouTubeUrl("https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBeNull();
  });

  it("accepts common watch and embeddable short links", () => {
    const v = "dQw4w9WgXcQ";
    expect(isStrictYouTubeVideoUrl(`https://www.youtube.com/watch?v=${v}`)).toBe(
      true,
    );
    expect(isStrictYouTubeVideoUrl(`https://m.youtube.com/watch?v=${v}`)).toBe(
      true,
    );
    expect(isStrictYouTubeVideoUrl(`https://youtu.be/${v}`)).toBe(true);
    expect(parseYoutubeVideoId(`https://youtu.be/${v}`)).toBe(v);
  });

  it("requires 11-char id for v=", () => {
    expect(isStrictYouTubeVideoUrl("https://www.youtube.com/watch?v=short")).toBe(
      false,
    );
  });

  it("classifies playlist vs channel", () => {
    expect(
      isStrictYouTubePlaylistUrl(
        "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4STNOKJ4tYqjLmhkDx",
      ),
    ).toBe(true);
    expect(
      isStrictYouTubeChannelOrTabUrl(
        "https://www.youtube.com/@SomeChannel/videos",
      ),
    ).toBe(true);
  });
});
