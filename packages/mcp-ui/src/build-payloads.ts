import type { ExtractionJob, Resource, TranscriptSegment } from "@scriptiz/schemas";
import type { UserList } from "@scriptiz/schemas";
import {
  jobStatusViewSchema,
  listViewSchema,
  videoTranscriptViewSchema,
} from "./payload-schemas.js";
import type {
  JobStatusView,
  ListView,
  McpUiAction,
  VideoTranscriptView,
} from "./payload-schemas.js";
import { youtubeVideoUrls } from "./youtube-video.js";

const DEFAULT_ACTIONS: McpUiAction[] = [
  "insert_segment_to_chat",
  "insert_range_to_chat",
  "save_to_list",
];

/**
 * `video_transcript_view` — timed segments + YouTube 임베드용 URL.
 */
export function buildVideoTranscriptView(input: {
  resource: Resource;
  language: string;
  segments: TranscriptSegment[];
  nextCursor?: string;
  /** 기본: 플랜에 나온 3종 액션 전부 */
  actions?: McpUiAction[];
}): VideoTranscriptView {
  const { resource, language, segments, nextCursor, actions = DEFAULT_ACTIONS } =
    input;
  const urls = youtubeVideoUrls(resource);
  if (!urls) {
    throw new Error("buildVideoTranscriptView: not a YouTube video resource");
  }
  const payload: VideoTranscriptView = {
    type: "video_transcript_view",
    resource,
    video: {
      provider: "youtube",
      embedUrl: urls.embedUrl,
      watchUrl: urls.watchUrl,
    },
    transcript: {
      language,
      segments,
      ...(nextCursor ? { nextCursor } : {}),
    },
    actions: [...actions],
  };
  return videoTranscriptViewSchema.parse(payload);
}

export function buildListView(input: {
  list: UserList;
  items: ListView["items"];
}): ListView {
  const payload: ListView = {
    type: "list_view",
    list: input.list,
    items: input.items,
  };
  return listViewSchema.parse(payload);
}

export function buildJobStatusView(input: {
  job: ExtractionJob;
  resource?: Resource;
}): JobStatusView {
  const payload: JobStatusView = {
    type: "job_status_view",
    job: input.job,
    ...(input.resource ? { resource: input.resource } : {}),
  };
  return jobStatusViewSchema.parse(payload);
}
