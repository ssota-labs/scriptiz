import { defaultScriptizDataDir, ensureScriptizDataLayout } from "@scriptiz/core";
import { YtDlpExtractor } from "@scriptiz/extractor-ytdlp";
import { LocalJobQueue } from "@scriptiz/queue-local";
import { FilesystemStorage } from "@scriptiz/storage-filesystem";
import type { ExtractionJob } from "@scriptiz/schemas";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { processVideoExtractionJob } from "./process-video-job.js";

export { processVideoExtractionJob };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

export async function runWorkerLoop(
  options: {
    dataDir: string;
    pollIntervalMs: number;
    defaultTranscriptLanguage: string;
    staleRunningJobAfterMs: number;
  },
): Promise<void> {
  const {
    dataDir,
    pollIntervalMs,
    defaultTranscriptLanguage,
    staleRunningJobAfterMs,
  } = options;
  const storage = new FilesystemStorage(dataDir);
  const queue = new LocalJobQueue(dataDir);
  const extractor = new YtDlpExtractor();

  for (;;) {
    const n = await queue.requeueStaleRunning(staleRunningJobAfterMs, nowIso());
    if (n > 0) {
      console.error(`[worker] requeued ${n} stale running job(s)`);
    }
    const job = await queue.tryClaimNext();
    if (!job) {
      await sleep(pollIntervalMs);
      continue;
    }
    try {
      if (job.kind === "video") {
        await processVideoExtractionJob({
          job,
          dataDir,
          defaultLanguage: defaultTranscriptLanguage,
          queue,
          storage,
          extractor,
        });
        continue;
      }
      const failed: ExtractionJob = {
        ...job,
        status: "failed",
        errorCode: "WORKER_UNSUPPORTED_KIND",
        errorMessage: `M3 worker only processes kind=video, got: ${job.kind}`,
        updatedAt: nowIso(),
      };
      await queue.moveToFailed(job.id, failed);
    } catch (e) {
      console.error("[worker] job failed with uncaught error", e);
    }
  }
}

export async function main() {
  const dataDir = process.env.DATA_DIR?.trim()
    ? path.resolve(process.env.DATA_DIR)
    : defaultScriptizDataDir();
  await ensureScriptizDataLayout(dataDir);
  const pollIntervalMs = Number(
    process.env.WORKER_POLL_INTERVAL_MS ?? 2000,
  );
  const defaultTranscriptLanguage =
    process.env.DEFAULT_TRANSCRIPT_LANGUAGE ?? "en";
  const staleRunningJobAfterMs = Number(
    process.env.WORKER_STALE_JOB_AFTER_MS ?? 30 * 60 * 1000,
  );
  await runWorkerLoop({
    dataDir,
    pollIntervalMs,
    defaultTranscriptLanguage,
    staleRunningJobAfterMs: Number.isFinite(staleRunningJobAfterMs) &&
        staleRunningJobAfterMs > 0
      ? staleRunningJobAfterMs
      : 30 * 60 * 1000,
  });
}

const isMain =
  typeof process.argv[1] === "string" &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]!);
if (isMain) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
