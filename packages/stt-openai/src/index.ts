import type { TranscriptSegment } from "@scriptiz/schemas";
import { basename } from "node:path";
import { readFile } from "node:fs/promises";

export const packageName = "@scriptiz/stt-openai" as const;

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

/**
 * Whisper-1 transcription API (`response_format: verbose_json`).
 */
export async function transcribeWithOpenAI(input: {
  filePath: string;
  /** ISO-639-1, e.g. `en`, `ko` */
  language: string;
  apiKey: string;
}): Promise<{ segments: TranscriptSegment[] }> {
  const buf = await readFile(input.filePath);
  const name = basename(input.filePath);
  const form = new FormData();
  form.append("file", new Blob([buf]), name);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("language", input.language);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}` },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new SttHttpError(
      `OpenAI STT failed: ${res.status}`,
      res.status,
      raw,
    );
  }
  const body = JSON.parse(raw) as OpenAiVerboseJson;
  return { segments: openAiVerboseJsonToSegments(body) };
}
