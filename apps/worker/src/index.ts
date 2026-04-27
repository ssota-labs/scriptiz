import { defaultScriptizDataDir } from "@scriptiz/core";
import { YtDlpExtractor } from "@scriptiz/extractor-ytdlp";
import { LocalJobQueue } from "@scriptiz/queue-local";
import { FilesystemStorage } from "@scriptiz/storage-filesystem";
import type { ExtractionJob } from "@scriptiz/schemas";
import { mkdir } from "node:fs/promises";
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
  },
): Promise<void> {
  const { dataDir, pollIntervalMs, defaultTranscriptLanguage } = options;
  const storage = new FilesystemStorage(dataDir);
  const queue = new LocalJobQueue(dataDir);
  const extractor = new YtDlpExtractor();

  for (;;) {
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
  await mkdir(dataDir, { recursive: true });
  const pollIntervalMs = Number(
    process.env.WORKER_POLL_INTERVAL_MS ?? 2000,
  );
  const defaultTranscriptLanguage =
    process.env.DEFAULT_TRANSCRIPT_LANGUAGE ?? "en";
  await runWorkerLoop({
    dataDir,
    pollIntervalMs,
    defaultTranscriptLanguage,
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
