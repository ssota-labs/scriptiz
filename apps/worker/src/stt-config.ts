export type SttProviderKind = "openai" | "xai";

export type SttResolveResult =
  | { kind: "ready"; provider: SttProviderKind; apiKey: string }
  | { kind: "invalid_provider"; raw: string }
  | { kind: "missing_api_key"; provider: SttProviderKind }
  | { kind: "no_api_key_available" };

/**
 * Resolves STT provider and API key from env.
 *
 * - `STT_PROVIDER=openai|xai` forces that provider (requires matching key).
 * - Unset `STT_PROVIDER`: prefer `OPENAI_API_KEY`, then `XAI_API_KEY`.
 * - Any other `STT_PROVIDER` value → `invalid_provider`.
 */
export function resolveSttProvider(env: NodeJS.ProcessEnv): SttResolveResult {
  const raw = env.STT_PROVIDER?.trim();
  const explicit = raw?.toLowerCase();
  const openai = env.OPENAI_API_KEY?.trim();
  const xai = env.XAI_API_KEY?.trim();

  if (raw && explicit !== "openai" && explicit !== "xai") {
    return { kind: "invalid_provider", raw };
  }

  if (explicit === "openai") {
    return openai
      ? { kind: "ready", provider: "openai", apiKey: openai }
      : { kind: "missing_api_key", provider: "openai" };
  }
  if (explicit === "xai") {
    return xai
      ? { kind: "ready", provider: "xai", apiKey: xai }
      : { kind: "missing_api_key", provider: "xai" };
  }

  if (openai) return { kind: "ready", provider: "openai", apiKey: openai };
  if (xai) return { kind: "ready", provider: "xai", apiKey: xai };
  return { kind: "no_api_key_available" };
}
