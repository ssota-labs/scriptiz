import type { Resource } from "@scriptiz/schemas";

/** YouTube video `Resource`만 지원 (MVP). */
export function youtubeVideoUrls(resource: Resource): {
  embedUrl: string;
  watchUrl: string;
} | null {
  if (resource.platform !== "youtube" || resource.type !== "video") {
    return null;
  }
  const id = resource.sourceId;
  return {
    embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(id)}`,
    watchUrl:
      resource.sourceUrl?.length
        ? resource.sourceUrl
        : `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
  };
}
