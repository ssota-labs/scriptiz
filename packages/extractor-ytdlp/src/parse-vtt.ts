import type { TranscriptSegment } from "@scriptiz/schemas";

const TS =
  /(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})\.(\d{1,3})\s*-->\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})\.(\d{1,3})/;

function toMs(
  h: string | undefined,
  m: string,
  s: string,
  ms: string,
): number {
  const H = h ? parseInt(h, 10) : 0;
  return (
    (H * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)) * 1000 +
    parseInt(ms.padEnd(3, "0").slice(0, 3), 10)
  );
}

/**
 * Minimal WEBVTT / 자막 cue 파서 (yt-dlp 산출 전제).
 */
export function parseVttToSegments(
  vtt: string,
): { segments: TranscriptSegment[]; warnings: string[] } {
  const warnings: string[] = [];
  const segments: TranscriptSegment[] = [];
  const textBlocks = vtt.split(/\r?\n\r?\n/);
  let index = 0;
  for (const block of textBlocks) {
    const lines = block.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) {
      continue;
    }
    let timeLine = lines[0]!;
    let bodyStart = 1;
    if (!TS.test(timeLine) && lines.length > 1 && /^\d+$/.test(timeLine)) {
      timeLine = lines[1]!;
      bodyStart = 2;
    }
    const m = timeLine.match(TS);
    if (!m) {
      continue;
    }
    const startMs = toMs(m[1], m[2]!, m[3]!, m[4]!);
    const endMs = toMs(m[5], m[6]!, m[7]!, m[8]!);
    if (endMs < startMs) {
      warnings.push("cue with end < start dropped");
      continue;
    }
    const text = lines
      .slice(bodyStart)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (!text) {
      continue;
    }
    segments.push({ index, startMs, endMs, text });
    index += 1;
  }
  return { segments, warnings };
}
