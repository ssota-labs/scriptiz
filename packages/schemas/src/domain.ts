import { z } from "zod";

export const resourceTypeSchema = z.enum(["video", "playlist", "channel"]);
export const platformSchema = z.literal("youtube");
export const transcriptSourceSchema = z.enum([
  "native_caption",
  "auto_caption",
  "stt",
]);
export const transcriptStatusSchema = z.enum(["completed", "failed"]);

export const resourceSchema = z.object({
  id: z.string().min(1),
  type: resourceTypeSchema,
  platform: platformSchema,
  sourceUrl: z.string().min(1),
  sourceId: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  ownerName: z.string().optional(),
  ownerSourceId: z.string().optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  thumbnailUrl: z.string().optional(),
  publishedAt: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const transcriptSegmentSchema = z.object({
  index: z.number().int().nonnegative(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  text: z.string(),
});

export const transcriptSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  language: z.string().min(1),
  source: transcriptSourceSchema,
  status: transcriptStatusSchema,
  segments: z.array(transcriptSegmentSchema),
  rawSubtitlePath: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const userListItemSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  note: z.string().optional(),
  addedAt: z.string().min(1),
});

export const userListSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string().optional(),
  items: z.array(userListItemSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const extractionJobStatusSchema = z.enum([
  "queued",
  "fetching_metadata",
  "fetching_caption",
  "transcribing",
  "completed",
  "failed",
  "fallback_required",
]);

export const extractionJobKindSchema = z.enum([
  "video",
  "playlist",
  "channel_latest",
]);

export const extractionJobSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1).optional(),
  sourceUrl: z.string().min(1),
  kind: extractionJobKindSchema,
  status: extractionJobStatusSchema,
  allowSttFallback: z.boolean(),
  language: z.string().min(1).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const transcriptCursorPayloadSchema = z.object({
  resourceId: z.string().min(1),
  language: z.string().min(1),
  nextIndex: z.number().int().nonnegative(),
});

export type ResourceType = z.infer<typeof resourceTypeSchema>;
export type Platform = z.infer<typeof platformSchema>;
export type TranscriptSource = z.infer<typeof transcriptSourceSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;
export type Transcript = z.infer<typeof transcriptSchema>;
export type UserListItem = z.infer<typeof userListItemSchema>;
export type UserList = z.infer<typeof userListSchema>;
export type ExtractionJobStatus = z.infer<typeof extractionJobStatusSchema>;
export type ExtractionJobKind = z.infer<typeof extractionJobKindSchema>;
export type ExtractionJob = z.infer<typeof extractionJobSchema>;
export type TranscriptCursorPayload = z.infer<
  typeof transcriptCursorPayloadSchema
>;
