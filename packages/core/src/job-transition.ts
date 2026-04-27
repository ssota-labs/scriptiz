import type { ExtractionJobStatus } from "@scriptiz/schemas";

const validNext: Record<ExtractionJobStatus, readonly ExtractionJobStatus[]> = {
  queued: ["fetching_metadata", "failed"],
  fetching_metadata: ["fetching_caption", "failed"],
  fetching_caption: [
    "completed",
    "transcribing",
    "fallback_required",
    "failed",
  ],
  fallback_required: ["transcribing", "failed"],
  transcribing: ["completed", "failed"],
  completed: [],
  failed: [],
};

export function isValidJobTransition(
  from: ExtractionJobStatus,
  to: ExtractionJobStatus,
): boolean {
  return (validNext[from] as readonly ExtractionJobStatus[]).includes(to);
}

export type JobTransitionError = {
  code: "invalid_transition";
  message: string;
  from: ExtractionJobStatus;
  to: ExtractionJobStatus;
};

export function requireJobTransition(
  from: ExtractionJobStatus,
  to: ExtractionJobStatus,
): void {
  if (!isValidJobTransition(from, to)) {
    const err: JobTransitionError = {
      code: "invalid_transition",
      message: `Cannot transition job from "${from}" to "${to}"`,
      from,
      to,
    };
    throw Object.assign(new Error(err.message), err);
  }
}
