import type { TranscriptSegment } from "@scriptiz/schemas";
import { basename } from "node:path";
import { readFile, stat } from "node:fs/promises";

export const packageName = "@scriptiz/stt-xai" as const;

export type SttProviderId = "xai";

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
      `xAI STT request timed out after ${timeoutMs}ms (STT_TIMEOUT_MS)`,
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

type XaiSttJson = {
  text?: string;
  duration?: number;
  words?: { text: string; start: number; end: number }[];
};

/**
 * xAI STT REST 응답 → {@link TranscriptSegment} 리스트.
 * @see https://docs.x.ai/developers/model-capabilities/audio/speech-to-text
 */
export function xaiSttJsonToSegments(body: XaiSttJson): TranscriptSegment[] {
  const words = body.words;
  if (words?.length) {
    return words.map((w, i) => ({
      index: i,
      startMs: Math.round(w.start * 1000),
      endMs: Math.round(w.end * 1000),
      text: w.text,
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
 * xAI `POST https://api.x.ai/v1/stt` (multipart). `file`은 폼의 **마지막** 필드여야 함.
 */
export async function transcribeWithXai(input: {
  filePath: string;
  /** 언어 코드, `format=true`일 때 ITN·포맷에 사용 */
  language: string;
  apiKey: string;
  maxAudioBytes?: number;
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
  form.append("format", "true");
  form.append("language", input.language);
  form.append("file", new Blob([buf]), name);

  let res: Response;
  try {
    res = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(Math.max(1, tmo)),
    });
  } catch (e) {
    if (isAbortLike(e)) {
      throw new SttTimeoutError("xai", tmo);
    }
    throw e;
  }

  const raw = await res.text();
  if (!res.ok) {
    throw new SttHttpError(
      `xAI STT failed: HTTP ${res.status}`,
      "xai",
      res.status,
      raw,
    );
  }
  let body: XaiSttJson;
  try {
    body = JSON.parse(raw) as XaiSttJson;
  } catch {
    throw new Error(
      `xAI STT: response was not valid JSON (STT provider: xai)`,
    );
  }
  return { segments: xaiSttJsonToSegments(body) };
}
