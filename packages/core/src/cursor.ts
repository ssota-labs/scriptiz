import { transcriptCursorPayloadSchema } from "@scriptiz/schemas";
import type { TranscriptCursorPayload } from "@scriptiz/schemas";

const decoder = new TextDecoder();

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64Url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function encodeTranscriptCursor(payload: TranscriptCursorPayload): string {
  const json = JSON.stringify({
    resourceId: payload.resourceId,
    language: payload.language,
    nextIndex: payload.nextIndex,
  });
  return toBase64Url(Buffer.from(json, "utf8"));
}

export function decodeTranscriptCursor(cursor: string): TranscriptCursorPayload {
  let raw: string;
  try {
    raw = decoder.decode(fromBase64Url(cursor));
  } catch {
    throw new Error("Invalid transcript cursor: not valid base64url");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid transcript cursor: not valid JSON");
  }
  return transcriptCursorPayloadSchema.parse(parsed);
}
