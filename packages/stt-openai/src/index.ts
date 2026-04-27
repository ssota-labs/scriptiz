import type { TranscriptSegment } from "@scriptiz/schemas";
import { basename } from "node:path";
import { readFile, stat } from "node:fs/promises";

export const packageName = "@scriptiz/stt-openai" as const;

export type SttProviderId = "openai";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KiB", "MiB", "GiB"] as const;
  let v = n;
  let u = -1;
  while (u < units.length - 1 && v >= 1024) {
    v /= 1024;
    u += 1;
  }
  return `${v < 10 && u >= 0 ? v.toFixed(1) : Math.round(v)} ${units[u] ?? "B"}`;
}

export class SttHttpError extends Error {
  override readonly name = "SttHttpError";

  constructor(
    message: string,
    readonly provider: SttProviderId,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(message);
  }
}

export class SttTimeoutError extends Error {
  override readonly name = "SttTimeoutError";

  constructor(
    readonly provider: SttProviderId,
    readonly timeoutMs: number,
  ) {
    super(
      `OpenAI STT request timed out after ${timeoutMs}ms (STT_TIMEOUT_MS)`,
    );
  }
}

export class SttFileTooLargeError extends Error {
  override readonly name = "SttFileTooLargeError";

  constructor(
    readonly fileSizeBytes: number,
    readonly maxBytes: number,
  ) {
    super(
      `STT: audio file is ${formatBytes(fileSizeBytes)} (${fileSizeBytes} bytes); max ${formatBytes(maxBytes)} (${maxBytes} bytes) (STT_MAX_AUDIO_BYTES)`,
    );
  }
}

type OpenAiVerboseJson = {
  text?: string;
  duration?: number;
  segments?: { start: number; end: number; text: string }[];
};

/**
 * OpenAI Whisper `verbose_json` → {@link TranscriptSegment} 리스트.
 */
export function openAiVerboseJsonToSegments(body: OpenAiVerboseJson): TranscriptSegment[] {
  const segs = body.segments;
  if (segs?.length) {
    return segs.map((s, i) => ({
      index: i,
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      text: s.text.trim(),
    }));
  }
  const t = (body.text ?? "").trim();
  const endMs = Math.max(
    1,
    Math.round((body.duration ?? 0) * 1000) || (t ? t.length * 60 : 1),
  );
  return [{ index: 0, startMs: 0, endMs, text: t }];
}

function defaultSttMaxBytes(): number {
  const n = Number(process.env.STT_MAX_AUDIO_BYTES);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 25 * 1024 * 1024;
}

function defaultSttTimeoutMs(): number {
  const n = Number(process.env.STT_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 300_000;
}

function isAbortLike(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const any = e as { code?: string };
  return (
    e.name === "AbortError" ||
    e.name === "TimeoutError" ||
    any.code === "ABORT_ERR"
  );
}

/**
 * Whisper-1 transcription API (`response_format: verbose_json`).
 */
export async function transcribeWithOpenAI(input: {
  filePath: string;
  /** ISO-639-1, e.g. `en`, `ko` */
  language: string;
  apiKey: string;
  /** @default from `STT_MAX_AUDIO_BYTES` or 25 MiB */
  maxAudioBytes?: number;
  /** @default from `STT_TIMEOUT_MS` or 5 minutes */
  timeoutMs?: number;
}): Promise<{ segments: TranscriptSegment[] }> {
  const maxB = input.maxAudioBytes ?? defaultSttMaxBytes();
  const tmo = input.timeoutMs ?? defaultSttTimeoutMs();
  const s = await stat(input.filePath);
  if (s.size > maxB) {
    throw new SttFileTooLargeError(s.size, maxB);
  }
  const buf = await readFile(input.filePath);
  const name = basename(input.filePath);
  const form = new FormData();
  form.append("file", new Blob([buf]), name);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("language", input.language);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(Math.max(1, tmo)),
    });
  } catch (e) {
    if (isAbortLike(e)) {
      throw new SttTimeoutError("openai", tmo);
    }
    throw e;
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new SttHttpError(
      `OpenAI STT failed: HTTP ${res.status}`,
      "openai",
      res.status,
      raw,
    );
  }
  let body: OpenAiVerboseJson;
  try {
    body = JSON.parse(raw) as OpenAiVerboseJson;
  } catch {
    throw new Error(
      `OpenAI STT: response was not valid JSON (STT provider: openai)`,
    );
  }
  return { segments: openAiVerboseJsonToSegments(body) };
}
