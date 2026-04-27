import type { TranscriptSegment } from "@scriptiz/schemas";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";

export const packageName = "@scriptiz/stt-xai" as const;

export class SttHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string,
  ) {
    super(message);
    this.name = "SttHttpError";
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

/**
 * xAI `POST https://api.x.ai/v1/stt` (multipart). `file`은 폼의 **마지막** 필드여야 함.
 */
export async function transcribeWithXai(input: {
  filePath: string;
  /** 언어 코드, `format=true`일 때 ITN·포맷에 사용 */
  language: string;
  apiKey: string;
}): Promise<{ segments: TranscriptSegment[] }> {
  const buf = await readFile(input.filePath);
  const name = basename(input.filePath);
  const form = new FormData();
  form.append("format", "true");
  form.append("language", input.language);
  form.append("file", new Blob([buf]), name);

  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new SttHttpError(`xAI STT failed: ${res.status}`, res.status, raw);
  }
  const body = JSON.parse(raw) as XaiSttJson;
  return { segments: xaiSttJsonToSegments(body) };
}
