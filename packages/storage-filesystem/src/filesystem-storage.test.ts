import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FilesystemStorage } from "./filesystem-storage.js";
import type { Resource, Transcript } from "@scriptiz/schemas";

describe("FilesystemStorage", () => {
  let dataRoot: string;
  let store: FilesystemStorage;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "scriptiz-data-"));
    store = new FilesystemStorage(dataRoot);
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it("round-trips a resource", async () => {
    const r: Resource = {
      id: "youtube_video_abc12",
      type: "video",
      platform: "youtube",
      sourceUrl: "https://www.youtube.com/watch?v=abc12",
      sourceId: "abc12",
      title: "T",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await store.putResource(r);
    const got = await store.getResourceById("youtube_video_abc12");
    expect(got).toEqual(r);
  });

  it("round-trips a transcript and raw vtt", async () => {
    const t: Transcript = {
      id: "youtube_video_abc12_ko",
      resourceId: "youtube_video_abc12",
      language: "ko",
      source: "auto_caption",
      status: "completed",
      segments: [
        { index: 0, startMs: 0, endMs: 1000, text: "안녕" },
      ],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    await store.putTranscript(t);
    const rel = await store.putRawSubtitle(
      "youtube_video_abc12",
      "ko",
      "WEBVTT\n",
    );
    expect(rel).toBe("transcripts/youtube_video_abc12/raw.ko.vtt");
    const got = await store.getTranscript("youtube_video_abc12", "ko");
    expect(got).not.toBeNull();
    const raw = await readFile(
      path.join(
        dataRoot,
        "transcripts",
        "youtube_video_abc12",
        "raw.ko.vtt",
      ),
      "utf8",
    );
    expect(raw).toBe("WEBVTT\n");
  });
});
