import { CockpitProject, FieldDiff } from "./types.js";

const MONITORED_FIELDS: Array<keyof CockpitProject> = [
  "codeUrl",
  "playableUrl",
  "description",
  "screenshotUrl",
  "submittedHours",
  "overrideHoursJustification",
  "hackatimeId",
  "hackatimeProjects",
  "lapseLinks",
  "liveApproved",
  "liveReviewStatus",
  "liveReviewerVerdict",
  "liveReviewerJustification",
  "liveReviewerHours",
];

function areValuesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if ((a === null || a === undefined || a === "") && (b === null || b === undefined || b === "")) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => val === b[idx]);
  }
  return false;
}

/**
 * Computes deep field differences between existing project state and incoming state.
 */
export function computeProjectDiffs(
  existing: CockpitProject,
  incoming: CockpitProject
): FieldDiff[] {
  const diffs: FieldDiff[] = [];

  for (const field of MONITORED_FIELDS) {
    const oldValue = existing[field];
    const newValue = incoming[field];

    if (!areValuesEqual(oldValue, newValue)) {
      diffs.push({
        field,
        oldValue: oldValue ?? null,
        newValue: newValue ?? null,
      });
    }
  }

  return diffs;
}

/**
 * Generates human-readable changelog summary from diffs
 */
export function formatDiffSummary(diffs: FieldDiff[]): string {
  if (diffs.length === 0) return "No changes detected";
  if (diffs.length === 1) {
    const d = diffs[0];
    return `Updated ${d.field}: ${JSON.stringify(d.oldValue)} → ${JSON.stringify(d.newValue)}`;
  }
  const fieldNames = diffs.map((d) => d.field).join(", ");
  return `Updated ${diffs.length} fields: ${fieldNames}`;
}
