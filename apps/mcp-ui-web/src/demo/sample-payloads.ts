import {
  buildJobStatusView,
  buildListView,
  buildVideoTranscriptView,
} from "@scriptiz/mcp-ui";
import type { ExtractionJob, Resource } from "@scriptiz/schemas";

const now = "2026-01-01T00:00:00.000Z";

export const sampleVideoResource: Resource = {
  id: "youtube_video_dQw4w9WgXcQ",
  type: "video",
  platform: "youtube",
  sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  sourceId: "dQw4w9WgXcQ",
  title: "Rick Astley – Never Gonna Give You Up (Official Video)",
  createdAt: now,
  updatedAt: now,
};

export const sampleVideoTranscriptPayload = buildVideoTranscriptView({
  resource: sampleVideoResource,
  language: "en",
  segments: [
    {
      index: 0,
      startMs: 18640,
      endMs: 21880,
      text: "♪ We're no strangers to love ♪",
    },
    {
      index: 1,
      startMs: 22640,
      endMs: 26960,
      text: "♪ You know the rules and so do I ♪",
    },
  ],
});

export const sampleListPayload = buildListView({
  list: {
    id: "list_demo",
    name: "Demo list",
    description: "로컬 개발용 샘플",
    items: [
      {
        id: "item_1",
        resourceId: sampleVideoResource.id,
        addedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  items: [
    {
      resource: sampleVideoResource,
      extractionStatus: "completed",
      transcriptLanguages: ["en"],
    },
  ],
});

export const sampleJob: ExtractionJob = {
  id: "job_demo",
  resourceId: sampleVideoResource.id,
  sourceUrl: sampleVideoResource.sourceUrl,
  kind: "video",
  status: "fetching_caption",
  allowSttFallback: true,
  language: "en",
  createdAt: now,
  updatedAt: now,
};

export const sampleJobPayload = buildJobStatusView({
  job: sampleJob,
  resource: sampleVideoResource,
});
