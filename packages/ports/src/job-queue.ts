import type { ExtractionJob } from "@scriptiz/schemas";

export interface EnqueueOptions {
  /** Skip duplicate check against queued/ + running/ (for tests or admin). Default false. */
  skipDuplicateCheck?: boolean;
}

export interface JobQueuePort {
  /**
   * Writes job as queued/ID.json. Job.status must be `queued`.
   * @throws {DuplicateRunningJobError} if a conflicting job is in `queued/` or `running/`
   */
  enqueue(
    job: ExtractionJob,
    options?: EnqueueOptions,
  ): Promise<void>;

  /**
   * Oldest by file mtime: atomically renames queued → running, returns the job; or null if empty.
   */
  tryClaimNext(): Promise<ExtractionJob | null>;

  getJobById(jobId: string): Promise<ExtractionJob | null>;

  /** Replaces the JSON file in running/ (no folder change). */
  updateRunningJob(job: ExtractionJob): Promise<void>;

  /** running → completed */
  moveToCompleted(jobId: string, job: ExtractionJob): Promise<void>;

  /** running → failed */
  moveToFailed(jobId: string, job: ExtractionJob): Promise<void>;

  /**
   * For each file in running/ whose updatedAt is older than `now - staleAfterMs`, writes to queued/ with status `queued` and removes running/.
   * @returns how many jobs were requeued
   */
  requeueStaleRunning(
    staleAfterMs: number,
    nowIso: string,
  ): Promise<number>;

  /**
   * True if any job in `running/` (or, for implementations that support it, also `queued/`)
   * targets the same resource or the same `sourceUrl`+`kind`.
   */
  hasConflictingRunningJob(proposed: ExtractionJob): Promise<boolean>;
}

export class DuplicateRunningJobError extends Error {
  override readonly name = "DuplicateRunningJobError";

  constructor() {
    super("A job for this resource or URL is already queued or running");
  }
}
