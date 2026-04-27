import {
  DuplicateRunningJobError,
  type EnqueueOptions,
  type JobQueuePort,
} from "@scriptiz/ports";
import { extractionJobSchema } from "@scriptiz/schemas";
import type { ExtractionJob } from "@scriptiz/schemas";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { atomicWriteFile } from "./atomic.js";

const JOB_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function assertSafeJobId(jobId: string) {
  if (!JOB_ID_PATTERN.test(jobId) || !jobId.length) {
    throw new Error("Invalid job id for filesystem path");
  }
}

function fileNameFor(jobId: string) {
  return `${jobId}.json`;
}

export function extractionJobsConflict(
  a: ExtractionJob,
  b: ExtractionJob,
): boolean {
  if (a.id === b.id) {
    return false;
  }
  if (a.resourceId && b.resourceId && a.resourceId === b.resourceId) {
    return true;
  }
  if (a.sourceUrl === b.sourceUrl && a.kind === b.kind) {
    return true;
  }
  return false;
}

/**
 * `data` root: job files under data/jobs/{queued,running,completed,failed}/.
 */
export class LocalJobQueue implements JobQueuePort {
  private readonly jobsRoot: string;

  constructor(dataRoot: string) {
    this.jobsRoot = path.join(dataRoot, "jobs");
  }

  private sub(dir: string) {
    return path.join(this.jobsRoot, dir);
  }

  private paths(jobId: string) {
    assertSafeJobId(jobId);
    const name = fileNameFor(jobId);
    return {
      name,
      queued: path.join(this.sub("queued"), name),
      running: path.join(this.sub("running"), name),
      completed: path.join(this.sub("completed"), name),
      failed: path.join(this.sub("failed"), name),
    };
  }

  private async ensureDirs() {
    await mkdir(this.jobsRoot, { recursive: true });
    for (const s of ["queued", "running", "completed", "failed"]) {
      await mkdir(this.sub(s), { recursive: true });
    }
  }

  async enqueue(
    job: ExtractionJob,
    options?: EnqueueOptions,
  ): Promise<void> {
    await this.ensureDirs();
    const parsed = extractionJobSchema.parse(job);
    if (parsed.status !== "queued") {
      throw new Error("enqueue: job.status must be queued");
    }
    if (!options?.skipDuplicateCheck) {
      if (await this.hasConflictingActiveJob(parsed)) {
        throw new DuplicateRunningJobError();
      }
    }
    const p = this.paths(parsed.id).queued;
    if (await fileExists(p)) {
      throw new Error(`Job file already exists in queued: ${parsed.id}`);
    }
    const body = `${JSON.stringify(parsed, null, 2)}\n`;
    await atomicWriteFile(p, body);
  }

  async tryClaimNext(): Promise<ExtractionJob | null> {
    await this.ensureDirs();
    const dir = this.sub("queued");
    if (!(await fileExists(dir))) {
      return null;
    }
    const names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    if (names.length === 0) {
      return null;
    }
    const withMtime = await Promise.all(
      names.map(async (n) => {
        const p = path.join(dir, n);
        const s = await stat(p);
        return { n, m: s.mtimeMs };
      }),
    );
    withMtime.sort((a, b) => a.m - b.m);
    for (const { n } of withMtime) {
      const from = path.join(dir, n);
      const to = path.join(this.sub("running"), n);
      try {
        await rename(from, to);
        const text = await readFile(to, "utf8");
        return extractionJobSchema.parse(JSON.parse(text) as unknown);
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code === "ENOENT") {
          continue;
        }
        throw e;
      }
    }
    return null;
  }

  async getJobById(jobId: string): Promise<ExtractionJob | null> {
    const { queued, running, completed, failed } = this.paths(jobId);
    for (const p of [queued, running, completed, failed]) {
      if (await fileExists(p)) {
        const text = await readFile(p, "utf8");
        return extractionJobSchema.parse(JSON.parse(text) as unknown);
      }
    }
    return null;
  }

  async updateRunningJob(job: ExtractionJob): Promise<void> {
    const parsed = extractionJobSchema.parse(job);
    const p = this.paths(parsed.id).running;
    if (!(await fileExists(p))) {
      throw new Error(`No running job file for id ${parsed.id}`);
    }
    const body = `${JSON.stringify(parsed, null, 2)}\n`;
    await atomicWriteFile(p, body);
  }

  async moveToCompleted(jobId: string, job: ExtractionJob): Promise<void> {
    const parsed = extractionJobSchema.parse(job);
    const { running, completed } = this.paths(jobId);
    if (parsed.id !== jobId) {
      throw new Error("moveToCompleted: jobId mismatch");
    }
    if (!(await fileExists(running))) {
      throw new Error(`No running job file for id ${jobId}`);
    }
    if (await fileExists(completed)) {
      throw new Error(`Job already in completed: ${jobId}`);
    }
    const body = `${JSON.stringify(parsed, null, 2)}\n`;
    await atomicWriteFile(completed, body);
    await unlink(running);
  }

  async moveToFailed(jobId: string, job: ExtractionJob): Promise<void> {
    const parsed = extractionJobSchema.parse(job);
    const { running, failed } = this.paths(jobId);
    if (parsed.id !== jobId) {
      throw new Error("moveToFailed: jobId mismatch");
    }
    if (!(await fileExists(running))) {
      throw new Error(`No running job file for id ${jobId}`);
    }
    if (await fileExists(failed)) {
      throw new Error(`Job already in failed: ${jobId}`);
    }
    const body = `${JSON.stringify(parsed, null, 2)}\n`;
    await atomicWriteFile(failed, body);
    await unlink(running);
  }

  async requeueStaleRunning(
    staleAfterMs: number,
    nowIso: string,
  ): Promise<number> {
    await this.ensureDirs();
    const runDir = this.sub("running");
    if (!(await fileExists(runDir))) {
      return 0;
    }
    const names = (await readdir(runDir)).filter((f) => f.endsWith(".json"));
    let count = 0;
    const now = new Date(nowIso).getTime();
    for (const n of names) {
      const runPath = path.join(runDir, n);
      const text = await readFile(runPath, "utf8");
      const job = extractionJobSchema.parse(JSON.parse(text) as unknown);
      const updated = new Date(job.updatedAt).getTime();
      if (Number.isNaN(updated)) {
        continue;
      }
      if (now - updated <= staleAfterMs) {
        continue;
      }
      const requeued: ExtractionJob = {
        ...job,
        status: "queued",
        updatedAt: nowIso,
      };
      const queuedPath = this.paths(requeued.id).queued;
      if (await fileExists(queuedPath)) {
        continue;
      }
      await atomicWriteFile(
        queuedPath,
        `${JSON.stringify(requeued, null, 2)}\n`,
      );
      await unlink(runPath);
      count += 1;
    }
    return count;
  }

  async hasConflictingRunningJob(
    proposed: ExtractionJob,
  ): Promise<boolean> {
    return this.hasConflictingActiveJob(proposed);
  }

  /**
   * True if a conflicting job exists in `queued/` or `running/`.
   */
  async hasConflictingActiveJob(
    proposed: ExtractionJob,
  ): Promise<boolean> {
    return (
      (await this.hasConflictingInDir(this.sub("queued"), proposed)) ||
      (await this.hasConflictingInDir(this.sub("running"), proposed))
    );
  }

  private async hasConflictingInDir(
    dir: string,
    proposed: ExtractionJob,
  ): Promise<boolean> {
    await this.ensureDirs();
    if (!(await fileExists(dir))) {
      return false;
    }
    const names = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    for (const n of names) {
      const p = path.join(dir, n);
      const text = await readFile(p, "utf8");
      const other = extractionJobSchema.parse(JSON.parse(text) as unknown);
      if (extractionJobsConflict(other, proposed)) {
        return true;
      }
    }
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}
