import type { TranscriptSegment } from "@scriptiz/schemas";

/**
 * [startMs, endMs) 구간과 겹치는 세그먼트만 반환한다. 입력은 index 순으로 정렬된 것이 이상적이다.
 */
export function sliceSegmentsByTimeRange(
  segments: TranscriptSegment[],
  startMs: number,
  endMs: number,
): TranscriptSegment[] {
  if (endMs < startMs) {
    throw new Error("endMs must be greater than or equal to startMs");
  }
  return segments.filter(
    (s) => s.endMs > startMs && s.startMs < endMs,
  );
}

export function joinSegmentTexts(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => s.text.trim())
    .filter((t) => t.length > 0)
    .join(" ");
}
