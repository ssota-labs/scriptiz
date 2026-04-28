import {
  extractionJobSchema,
  extractionJobStatusSchema,
  resourceSchema,
  transcriptSegmentSchema,
  userListSchema,
} from "@scriptiz/schemas";
import { z } from "zod";

export const mcpUiActionSchema = z.enum([
  "insert_segment_to_chat",
  "insert_range_to_chat",
  "save_to_list",
]);

export const videoTranscriptViewSchema = z.object({
  type: z.literal("video_transcript_view"),
  resource: resourceSchema,
  video: z.object({
    provider: z.literal("youtube"),
    embedUrl: z.string().min(1),
    watchUrl: z.string().min(1),
  }),
  transcript: z.object({
    language: z.string().min(1),
    segments: z.array(transcriptSegmentSchema),
    nextCursor: z.string().optional(),
  }),
  actions: z.array(mcpUiActionSchema),
});

export const listViewItemSchema = z.object({
  resource: resourceSchema,
  extractionStatus: extractionJobStatusSchema.optional(),
  transcriptLanguages: z.array(z.string()),
});

export const listViewSchema = z.object({
  type: z.literal("list_view"),
  list: userListSchema,
  items: z.array(listViewItemSchema),
});

export const jobStatusViewSchema = z.object({
  type: z.literal("job_status_view"),
  job: extractionJobSchema,
  resource: resourceSchema.optional(),
});

/** Fallback when tool output is not mapped to video/list/job views. */
export const genericToolViewSchema = z.object({
  type: z.literal("generic_tool_view"),
  tool: z.string().min(1),
  payload: z.record(z.unknown()),
});

export type VideoTranscriptView = z.infer<typeof videoTranscriptViewSchema>;
export type ListView = z.infer<typeof listViewSchema>;
export type JobStatusView = z.infer<typeof jobStatusViewSchema>;
export type GenericToolView = z.infer<typeof genericToolViewSchema>;
export type McpUiAction = z.infer<typeof mcpUiActionSchema>;
