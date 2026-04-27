import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DuplicateRunningJobError } from "@scriptiz/ports";
import type { ExtractionJob } from "@scriptiz/schemas";
import { LocalJobQueue, extractionJobsConflict } from "./local-job-queue.js";

function job(
  id: string,
  status: ExtractionJob["status"],
  extra?: Partial<ExtractionJob>,
): ExtractionJob {
  return {
    id,
    sourceUrl: "https://www.youtube.com/watch?v=testvid",
    kind: "video",
    status,
    allowSttFallback: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...extra,
  };
}

describe("extractionJobsConflict", () => {
  it("detects same resourceId", () => {
    const a = job("a", "queued", { resourceId: "youtube_video_x" });
    const b = job("b", "queued", { resourceId: "youtube_video_x" });
    expect(extractionJobsConflict(a, b)).toBe(true);
  });

  it("is false for same id (identity)", () => {
    const a = job("x", "queued");
    const b = job("x", "queued");
    expect(extractionJobsConflict(a, b)).toBe(false);
  });
});

describe("LocalJobQueue", () => {
  let dataRoot: string;
  let q: LocalJobQueue;

  beforeEach(async () => {
    dataRoot = await mkdtemp(path.join(tmpdir(), "scriptiz-jobs-"));
    q = new LocalJobQueue(dataRoot);
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it("enqueues, claims, completes, and reads from completed", async () => {
    const j = job("job_a", "queued");
    await q.enqueue(j);
    const claimed = await q.tryClaimNext();
    expect(claimed?.id).toBe("job_a");
    expect(claimed?.status).toBe("queued");
    const done: ExtractionJob = {
      ...claimed!,
      status: "completed",
      resourceId: "youtube_video_abc12",
      updatedAt: "2026-01-01T00:00:01.000Z",
    };
    await q.moveToCompleted("job_a", done);
    const fromDisk = await q.getJobById("job_a");
    expect(fromDisk?.status).toBe("completed");
  });

  it("throws on duplicate while another is running", async () => {
    await q.enqueue(job("job_1", "queued"));
    await q.tryClaimNext();
    const second = job("job_2", "queued", {
      sourceUrl: "https://www.youtube.com/watch?v=testvid",
    });
    await expect(q.enqueue(second)).rejects.toBeInstanceOf(
      DuplicateRunningJobError,
    );
  });

  it("requeues stale running jobs to queued", async () => {
    const j = job("job_s", "fetching_caption", {
      updatedAt: "2010-01-01T00:00:00.000Z",
    });
    const runPath = path.join(
      dataRoot,
      "jobs",
      "running",
      "job_s.json",
    );
    await mkdir(path.dirname(runPath), { recursive: true });
    await writeFile(
      runPath,
      `${JSON.stringify(j, null, 2)}\n`,
    );
    const n = await q.requeueStaleRunning(
      10 * 60 * 1000,
      "2026-01-15T00:00:00.000Z",
    );
    expect(n).toBe(1);
    const p = path.join(
      dataRoot,
      "jobs",
      "queued",
      "job_s.json",
    );
    const text = await readFile(p, "utf8");
    const back = JSON.parse(text) as ExtractionJob;
    expect(back.status).toBe("queued");
  });
});
