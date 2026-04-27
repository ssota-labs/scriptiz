import { describe, expect, it } from "vitest";
import path from "node:path";
import { assertSafeStorageSegment, isPathUnderRoot } from "./safe-storage-id.js";

describe("assertSafeStorageSegment", () => {
  it("accepts normal ids", () => {
    expect(() => assertSafeStorageSegment("youtube_video_abc", "id")).not.toThrow();
    expect(() => assertSafeStorageSegment("list_01", "id")).not.toThrow();
  });

  it("rejects traversal", () => {
    expect(() => assertSafeStorageSegment("..", "id")).toThrow();
    expect(() => assertSafeStorageSegment("a/../b", "id")).toThrow();
  });
});

describe("isPathUnderRoot", () => {
  it("rejects escape", () => {
    const root = "/app/data";
    const evil = path.resolve(root, "..", "etc", "passwd");
    expect(isPathUnderRoot(root, evil)).toBe(false);
  });
});
