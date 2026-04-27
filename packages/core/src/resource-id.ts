import type { ResourceType } from "@scriptiz/schemas";

const SOURCE_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const DEFAULT_PLATFORM = "youtube" as const;

/**
 * `platform_type_sourceId` (기술 플랜) — path traversal 문자는 허용하지 않는다.
 */
export function makeResourceId(
  type: ResourceType,
  sourceId: string,
  platform: typeof DEFAULT_PLATFORM = DEFAULT_PLATFORM,
): string {
  if (!SOURCE_ID_PATTERN.test(sourceId) || sourceId.length === 0) {
    throw new Error("sourceId must be non-empty and match [A-Za-z0-9._-]");
  }
  return `${platform}_${type}_${sourceId}`;
}

const LANGUAGE_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function makeTranscriptId(
  resourceId: string,
  language: string,
): string {
  if (!LANGUAGE_PATTERN.test(language) || language.length === 0) {
    throw new Error("language must be non-empty and match [a-zA-Z0-9._-]");
  }
  return `${resourceId}_${language}`;
}
