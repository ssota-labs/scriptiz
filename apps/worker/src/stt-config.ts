export type SttProviderKind = "openai" | "xai";

/**
 * `STT_PROVIDER=openai|xai`가 있으면 해당 키만 사용.
 * 없으면 `OPENAI_API_KEY` → 없으면 `XAI_API_KEY` 순.
 */
export function resolveSttProvider(env: NodeJS.ProcessEnv): {
  provider: SttProviderKind;
  apiKey: string;
} | null {
  const explicit = env.STT_PROVIDER?.trim().toLowerCase();
  const openai = env.OPENAI_API_KEY?.trim();
  const xai = env.XAI_API_KEY?.trim();

  if (explicit === "openai") {
    return openai ? { provider: "openai", apiKey: openai } : null;
  }
  if (explicit === "xai") {
    return xai ? { provider: "xai", apiKey: xai } : null;
  }
  if (!explicit) {
    if (openai) return { provider: "openai", apiKey: openai };
    if (xai) return { provider: "xai", apiKey: xai };
  }
  return null;
}
