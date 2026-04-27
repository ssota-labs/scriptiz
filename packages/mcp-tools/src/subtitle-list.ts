/**
 * `list_available_languages` 응답 (dump-json 기반).
 */
export function listLanguageOptionsFromDump(
  dump: unknown,
): Array<{
  language: string;
  source: "native_caption" | "auto_caption";
  name?: string;
}> {
  if (!dump || typeof dump !== "object") {
    return [];
  }
  const o = dump as {
    subtitles?: Record<string, unknown>;
    automatic_captions?: Record<string, unknown>;
  };
  const man = new Set(Object.keys(o.subtitles ?? {}));
  const out: Array<{
    language: string;
    source: "native_caption" | "auto_caption";
  }> = [];
  for (const lang of man) {
    out.push({ language: lang, source: "native_caption" });
  }
  for (const lang of Object.keys(o.automatic_captions ?? {})) {
    if (!man.has(lang)) {
      out.push({ language: lang, source: "auto_caption" });
    }
  }
  return out;
}
