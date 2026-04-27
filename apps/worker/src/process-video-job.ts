import { makeTranscriptId, requireJobTransition } from "@scriptiz/core";
import type { JobQueuePort } from "@scriptiz/ports";
import type { FilesystemStorage } from "@scriptiz/storage-filesystem";
import {
  mapVideoDumpToResource,
  parseVttToSegments,
  selectSubtitleTrack,
  YtDlpError,
  YtDlpExtractor,
} from "@scriptiz/extractor-ytdlp";
import type { ExtractionJob, Transcript } from "@scriptiz/schemas";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

export async function processVideoExtractionJob(input: {
  job: ExtractionJob;
  dataDir: string;
  defaultLanguage: string;
  queue: JobQueuePort;
  storage: FilesystemStorage;
  extractor: YtDlpExtractor;
}): Promise<void> {
  const { queue, storage, extractor, defaultLanguage } = input;
  let job = input.job;

  const subWorkDir = path.join(input.dataDir, "tmp", "subs", job.id);

  try {
    requireJobTransition(job.status, "fetching_metadata");
    job = { ...job, status: "fetching_metadata", updatedAt: nowIso() };
    await queue.updateRunningJob(job);

    const dump = await extractor.getYoutubeMetadataDump(job.sourceUrl);
    const { resource } = mapVideoDumpToResource(dump, nowIso());
    await storage.putResource(resource);

    requireJobTransition("fetching_metadata", "fetching_caption");
    job = {
      ...job,
      resourceId: resource.id,
      status: "fetching_caption",
      updatedAt: nowIso(),
    };
    await queue.updateRunningJob(job);

    const track = selectSubtitleTrack(
      dump,
      job.language ?? defaultLanguage,
    );
    if (!track) {
      if (job.allowSttFallback) {
        requireJobTransition("fetching_caption", "fallback_required");
        job = { ...job, status: "fallback_required", updatedAt: nowIso() };
        await queue.updateRunningJob(job);
        return;
      }
      const failed: ExtractionJob = {
        ...job,
        status: "failed",
        errorCode: "SUBTITLE_UNAVAILABLE",
        errorMessage: "No subtitles found and STT fallback disabled",
        updatedAt: nowIso(),
      };
      await queue.moveToFailed(job.id, failed);
      return;
    }

    await rm(subWorkDir, { recursive: true, force: true }).catch(() => {});

    const { vttPath, source } = await extractor.writeSubtitleVtt({
      url: job.sourceUrl,
      language: track.language,
      outputDir: subWorkDir,
      track,
    });
    const vtt = await readFile(vttPath, "utf8");
    const { segments } = parseVttToSegments(vtt);
    const rel = await storage.putRawSubtitle(
      resource.id,
      track.language,
      vtt,
    );
    const t: Transcript = {
      id: makeTranscriptId(resource.id, track.language),
      resourceId: resource.id,
      language: track.language,
      source,
      status: "completed",
      segments,
      rawSubtitlePath: rel,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await storage.putTranscript(t);

    requireJobTransition("fetching_caption", "completed");
    const done: ExtractionJob = {
      ...job,
      status: "completed",
      updatedAt: nowIso(),
    };
    await queue.moveToCompleted(job.id, done);
  } catch (e) {
    const code = e instanceof YtDlpError
      ? e.code
      : e instanceof Error
        ? "EXTRACT_ERROR"
        : "UNKNOWN";
    const message = e instanceof Error ? e.message : String(e);
    const latest = await queue.getJobById(job.id);
    const base = latest ?? job;
    const failed: ExtractionJob = {
      ...base,
      status: "failed",
      errorCode: code,
      errorMessage: message,
      updatedAt: nowIso(),
    };
    await queue.moveToFailed(base.id, failed);
  } finally {
    await rm(subWorkDir, { recursive: true, force: true }).catch(() => {});
  }
}
