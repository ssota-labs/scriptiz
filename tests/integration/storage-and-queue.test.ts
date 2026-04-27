import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { assertSafeStorageSegment } from "@scriptiz/core";
import { FilesystemStorage } from "@scriptiz/storage-filesystem";
import { resourceSchema } from "@scriptiz/schemas";
import type { Resource } from "@scriptiz/schemas";

describe("integration: storage + queue security defaults", () => {
  let dir: string;
  let storage: FilesystemStorage;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "scriptiz-int-"));
    storage = new FilesystemStorage(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("rejects path traversal in resource id", async () => {
    assertSafeStorageSegment("youtube_video_abc", "ok");
    await expect(
      storage.getResourceById("../../../etc/passwd"),
    ).rejects.toThrow();
  });

  it("accepts a normal put+read resource", async () => {
    const t = new Date().toISOString();
    const r: Resource = {
      id: "youtube_video_testid12",
      type: "video",
      platform: "youtube",
      sourceId: "testid12",
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "T",
      createdAt: t,
      updatedAt: t,
    };
    const parsed = resourceSchema.parse(r);
    await storage.putResource(parsed);
    const back = await storage.getResourceById(parsed.id);
    expect(back?.id).toBe(parsed.id);
  });
});
