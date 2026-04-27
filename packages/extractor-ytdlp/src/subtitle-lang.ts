import type { CaptionSourceKind } from "@scriptiz/ports";

type Track = { language: string; isAuto: boolean };

function listTracks(dump: unknown): Track[] {
  if (!dump || typeof dump !== "object") {
    return [];
  }
  const o = dump as {
    subtitles?: Record<string, unknown[]>;
    automatic_captions?: Record<string, unknown[]>;
  };
  const man = o.subtitles ?? {};
  const aut = o.automatic_captions ?? {};
  const nativeKeys = new Set(Object.keys(man));
  const out: Track[] = [];
  for (const k of nativeKeys) {
    out.push({ language: k, isAuto: false });
  }
  for (const k of Object.keys(aut)) {
    if (!nativeKeys.has(k)) {
      out.push({ language: k, isAuto: true });
    }
  }
  return out;
}

function normLang(s: string) {
  return s.toLowerCase().replace(/[-_]/g, "-");
}

function matchPreferred(
  preferred: string,
  tracks: Track[],
): Track | null {
  const n = normLang(preferred);
  const exact = tracks.find((t) => normLang(t.language) === n);
  if (exact) {
    return exact;
  }
  const prefBase = n.split("-")[0] ?? n;
  return (
    tracks.find((t) => {
      const b = normLang(t.language).split("-")[0] ?? "";
      return b === prefBase;
    }) ?? null
  );
}

/**
 * `preferred` (예: job.language) → 자막 트랙 1개 선택. 없으면 manual 우선, 그다음 auto.
 */
export function selectSubtitleTrack(
  dump: unknown,
  preferred?: string,
): { language: string; isAuto: boolean } | null {
  const tracks = listTracks(dump);
  if (tracks.length === 0) {
    return null;
  }
  if (preferred) {
    const m = matchPreferred(preferred, tracks);
    if (m) {
      return m;
    }
  }
  const man = tracks.filter((t) => !t.isAuto);
  if (man.length) {
    return man[0]!;
  }
  return tracks[0]! ?? null;
}

export function captionSourceFromTrack(
  t: { isAuto: boolean },
): CaptionSourceKind {
  return t.isAuto ? "auto_caption" : "native_caption";
}
