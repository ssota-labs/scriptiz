import { describe, it, expect } from "vitest";
import { parseVttToSegments } from "./parse-vtt.js";

const SAMPLE = `WEBVTT

00:00:00.000 --> 00:00:02.000
Hello

00:00:02.500 --> 00:00:04.000
World line two
second line
`;

describe("parseVttToSegments", () => {
  it("extracts cue text and time", () => {
    const { segments } = parseVttToSegments(SAMPLE);
    expect(segments[0]).toEqual({
      index: 0,
      startMs: 0,
      endMs: 2000,
      text: "Hello",
    });
    expect(segments[1]!.text).toBe("World line two second line");
  });
});
