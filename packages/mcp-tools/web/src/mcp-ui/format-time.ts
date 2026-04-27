/** 밀리초 → `m:ss` 또는 `h:mm:ss` (한 시간 미만이면 분:초만). */
export function formatMsRange(startMs: number, endMs: number): string {
  return `${formatMs(startMs)} – ${formatMs(endMs)}`;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}
