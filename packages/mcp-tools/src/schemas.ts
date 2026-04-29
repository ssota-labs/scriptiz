import { z } from "zod";

export const extractContentInput = z.object({
  url: z.string().min(1),
  language: z.string().min(1).optional(),
  allowSttFallback: z.boolean().optional(),
  forceRefresh: z.boolean().optional(),
  uiLocale: z.string().min(2).max(32).optional(),
});

export const jobIdInput = z.object({
  jobId: z.string().min(1),
  uiLocale: z.string().min(2).max(32).optional(),
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
