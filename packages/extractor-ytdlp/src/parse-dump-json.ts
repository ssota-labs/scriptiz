import { YtDlpError } from "./ytdlp-error.js";

/**
 * `yt-dlp --dump-json`는 단일 JSON 또는 줄 단위(playlist 등) JSON을 쓸 수 있다.
 */
export function parseDumpJsonLines(stdout: string): unknown[] {
  const t = stdout.trim();
  if (!t) {
    return [];
  }
  try {
    return [JSON.parse(t) as unknown];
  } catch {
    const out: unknown[] = [];
    for (const line of t.split(/\r?\n/)) {
      const s = line.trim();
      if (!s) {
        continue;
      }
      try {
        out.push(JSON.parse(s) as unknown);
      } catch {
        throw new YtDlpError("PARSE_FAILED", "yt-dlp dump-json line is not valid JSON");
      }
    }
    return out;
  }
}
