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
import {
  SttFileTooLargeError as SttTooLargeOai,
  SttHttpError as SttHttpOai,
  SttTimeoutError as SttTimeoutOai,
  transcribeWithOpenAI,
} from "@scriptiz/stt-openai";
import {
  SttFileTooLargeError as SttTooLargeXai,
  SttHttpError as SttHttpXai,
  SttTimeoutError as SttTimeoutXai,
  transcribeWithXai,
} from "@scriptiz/stt-xai";
import type { ExtractionJob, Transcript } from "@scriptiz/schemas";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { resolveSttProvider } from "./stt-config.js";

function nowIso() {
  return new Date().toISOString();
}

function mapSttFailure(e: unknown): { code: string; message: string } | null {
  if (e instanceof SttTooLargeOai || e instanceof SttTooLargeXai) {
    return { code: "STT_FILE_TOO_LARGE", message: e.message };
  }
  if (e instanceof SttHttpOai || e instanceof SttHttpXai) {
    const snippet = e.responseBody.trim().slice(0, 500);
    const detail = snippet ? ` — ${snippet}` : "";
    return {
      code: "STT_HTTP_ERROR",
      message: `${e.message}${detail}`,
    };
  }
  if (e instanceof SttTimeoutOai || e instanceof SttTimeoutXai) {
    return { code: "STT_TIMEOUT", message: e.message };
  }
  return null;
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

  const jobWorkRoot = path.join(input.dataDir, "tmp", "jobs", job.id);
  const subWorkDir = path.join(jobWorkRoot, "subs");
  const audioWorkDir = path.join(jobWorkRoot, "audio");

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
      if (!job.allowSttFallback) {
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
      const stt = resolveSttProvider(process.env);
      if (stt.kind === "invalid_provider") {
        const failed: ExtractionJob = {
          ...job,
          status: "failed",
          errorCode: "STT_PROVIDER_INVALID",
          errorMessage: `STT_PROVIDER must be openai or xai (got: ${stt.raw})`,
          updatedAt: nowIso(),
        };
        await queue.moveToFailed(job.id, failed);
        return;
      }
      if (stt.kind === "missing_api_key") {
        const failed: ExtractionJob = {
          ...job,
          status: "failed",
          errorCode: "STT_API_KEY_MISSING",
          errorMessage:
            stt.provider === "openai"
              ? "OPENAI_API_KEY is required when STT_PROVIDER=openai"
              : "XAI_API_KEY is required when STT_PROVIDER=xai",
          updatedAt: nowIso(),
        };
        await queue.moveToFailed(job.id, failed);
        return;
      }
      if (stt.kind === "no_api_key_available") {
        const failed: ExtractionJob = {
          ...job,
          status: "failed",
          errorCode: "STT_API_KEY_MISSING",
          errorMessage:
            "STT fallback requested but no API key: set OPENAI_API_KEY or XAI_API_KEY (optional: STT_PROVIDER=openai|xai)",
          updatedAt: nowIso(),
        };
        await queue.moveToFailed(job.id, failed);
        return;
      }

      requireJobTransition("fetching_caption", "transcribing");
      const lang = job.language ?? defaultLanguage;
      job = { ...job, status: "transcribing", updatedAt: nowIso() };
      await queue.updateRunningJob(job);

      await rm(audioWorkDir, { recursive: true, force: true }).catch(() => {});

      const { audioPath } = await extractor.downloadBestAudioM4a({
        url: job.sourceUrl,
        outputDir: audioWorkDir,
        fileName: "stt.m4a",
      });

      const { segments } =
        stt.provider === "openai"
          ? await transcribeWithOpenAI({
              filePath: audioPath,
              language: lang,
              apiKey: stt.apiKey,
            })
          : await transcribeWithXai({
              filePath: audioPath,
              language: lang,
              apiKey: stt.apiKey,
            });

      const t: Transcript = {
        id: makeTranscriptId(resource.id, lang),
        resourceId: resource.id,
        language: lang,
        source: "stt",
        status: "completed",
        segments,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await storage.putTranscript(t);

      requireJobTransition("transcribing", "completed");
      const done: ExtractionJob = {
        ...job,
        status: "completed",
        updatedAt: nowIso(),
      };
      await queue.moveToCompleted(job.id, done);
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
    const stt = mapSttFailure(e);
    if (stt) {
      const latest = await queue.getJobById(job.id);
      const base = latest ?? job;
      const failed: ExtractionJob = {
        ...base,
        status: "failed",
        errorCode: stt.code,
        errorMessage: stt.message,
        updatedAt: nowIso(),
      };
      await queue.moveToFailed(base.id, failed);
      return;
    }
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
    await rm(jobWorkRoot, { recursive: true, force: true }).catch(() => {});
  }
}
