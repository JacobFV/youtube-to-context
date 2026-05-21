import type { ProgressEvent, ProgressStage } from "./types";

type StagePlan = {
  stage: ProgressStage;
  label: string;
  blurb: string;
  start: number;
  end: number;
};

/**
 * Ordered pipeline plan. Each stage owns a slice of the overall 0..1 progress
 * bar. The slices are sized roughly by how long each stage tends to take so the
 * bar advances at a believable pace. Shared with the web client so the UI can
 * render the same stepper the server reports against.
 */
export const STAGE_PLAN: StagePlan[] = [
  { stage: "info", label: "Reading metadata", blurb: "Resolving the video and its details", start: 0.0, end: 0.04 },
  { stage: "download", label: "Downloading video", blurb: "Pulling the source file from YouTube", start: 0.04, end: 0.26 },
  { stage: "audio", label: "Extracting audio", blurb: "Demuxing a clean speech track", start: 0.26, end: 0.32 },
  { stage: "transcribe", label: "Transcribing speech", blurb: "Timing every spoken word", start: 0.32, end: 0.48 },
  { stage: "frames", label: "Sampling frames", blurb: "Capturing candidate stills across the timeline", start: 0.48, end: 0.56 },
  { stage: "vision", label: "Reading frames", blurb: "Describing and scoring each frame with vision", start: 0.56, end: 0.82 },
  { stage: "embed", label: "Embedding semantics", blurb: "Mapping how the frames relate to each other", start: 0.82, end: 0.86 },
  { stage: "select", label: "Selecting frames", blurb: "Choosing the most representative stills", start: 0.86, end: 0.88 },
  { stage: "cinematic", label: "Compiling grammar", blurb: "Extracting the reusable cinematic grammar", start: 0.88, end: 0.98 },
  { stage: "artifacts", label: "Packaging artifacts", blurb: "Writing the context pack and ZIP bundle", start: 0.98, end: 1.0 }
];

export type ProgressTracker = {
  report: (
    stage: ProgressStage,
    opts?: { detail?: string; current?: number; total?: number }
  ) => void;
};

const NOOP_TRACKER: ProgressTracker = { report: () => {} };

/**
 * Builds a tracker that converts coarse stage reports into smooth, monotonic
 * overall-progress events. Returns a no-op tracker when no sink is provided so
 * callers never need to null-check.
 */
export function createProgressTracker(
  onProgress?: (event: ProgressEvent) => void
): ProgressTracker {
  if (!onProgress) return NOOP_TRACKER;

  const startedAt = Date.now();
  let lastPct = 0;

  return {
    report(stage, opts = {}) {
      const plan = STAGE_PLAN.find((entry) => entry.stage === stage);
      let pct: number;
      if (stage === "done") {
        pct = 1;
      } else if (plan) {
        const total = opts.total ?? 0;
        const fraction = total > 0 ? Math.min(1, Math.max(0, (opts.current ?? 0) / total)) : 0;
        pct = plan.start + (plan.end - plan.start) * fraction;
      } else {
        pct = lastPct;
      }
      // Progress only ever moves forward.
      pct = Math.max(lastPct, pct);
      lastPct = pct;

      onProgress({
        stage,
        label: plan?.label ?? stage,
        detail: opts.detail,
        current: opts.current,
        total: opts.total,
        pct: Number(pct.toFixed(4)),
        elapsedMs: Date.now() - startedAt
      });
    }
  };
}
