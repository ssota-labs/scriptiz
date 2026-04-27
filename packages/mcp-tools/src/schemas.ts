import { z } from "zod";

export const extractContentInput = z.object({
  url: z.string().min(1),
  language: z.string().min(1).optional(),
  allowSttFallback: z.boolean().optional(),
  forceRefresh: z.boolean().optional(),
});

export const jobIdInput = z.object({
  jobId: z.string().min(1),
});

export const getContentInput = z.object({
  resourceId: z.string().min(1),
});

export const getTranscriptInput = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1).optional(),
  includeTimestamps: z.boolean().optional(),
  maxSegments: z.number().int().positive().optional(),
});

export const getTimedTranscriptInput = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(2000).optional(),
});

export const getTranscriptChunkInput = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limitSegments: z.number().int().positive().max(2000).optional(),
  includeTimestamps: z.boolean().optional(),
});

export const getTranscriptRangeInput = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1).optional(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
});

export const listAvailableLanguagesInput = z.object({
  resourceId: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
});

export const extractPlaylistInput = z.object({
  url: z.string().min(1),
  maxItems: z.number().int().positive().max(5000).optional(),
});

export const extractChannelLatestInput = z.object({
  url: z.string().min(1),
  maxItems: z.number().int().positive().max(5000).optional(),
});

export const createListInput = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const addResourceToListInput = z.object({
  listId: z.string().min(1),
  resourceId: z.string().min(1),
  note: z.string().optional(),
});

export const addPlaylistToListInput = z.object({
  listId: z.string().min(1),
  playlistResourceId: z.string().min(1),
  includeItems: z.boolean().optional(),
});

export const getListContentsInput = z.object({
  listId: z.string().min(1),
});

/** MCP UI: `video_transcript_view` — timed segments 페이지 (기본 limit 넉넉히) */
export const getVideoTranscriptViewInput = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(2000).optional(),
});

export const getListViewInput = z.object({
  listId: z.string().min(1),
});
