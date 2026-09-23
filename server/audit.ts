import { randomUUID } from "node:crypto";
import { formatDiffSummary } from "./change-detector.js";
import { storage } from "./storage.js";
import {
  AuditLogEntry,
  CockpitProject,
  FieldDiff,
  VerdictDetails,
} from "./types.js";

/**
 * Creates and appends an audit log entry for a newly discovered project
 */
export async function logProjectCreated(
  project: CockpitProject,
  actor = "live_sync"
): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    projectId: project.id,
    liveRecordId: project.liveRecordId,
    timestamp: new Date().toISOString(),
    source: "live_sync",
    actor,
    action: "project_created",
    diffs: [],
    summary: `Project imported from Live (${project.projectName}) with ${project.submittedHours}h requested`,
    metadata: {
      submittedAt: project.submittedAt,
      codeUrl: project.codeUrl,
      playableUrl: project.playableUrl,
    },
  };

  await storage.appendAuditLog(entry);
  return entry;
}

/**
 * Creates and appends an audit log entry for field modifications
 */
export async function logProjectUpdated(
  project: CockpitProject,
  diffs: FieldDiff[],
  actor = "live_sync"
): Promise<AuditLogEntry> {
  const summary = formatDiffSummary(diffs);
  const entry: AuditLogEntry = {
    id: randomUUID(),
    projectId: project.id,
    liveRecordId: project.liveRecordId,
    timestamp: new Date().toISOString(),
    source: "live_sync",
    actor,
    action: "project_updated",
    diffs,
    summary,
    metadata: {
      version: project.version,
      changeCount: project.changeCount,
    },
  };

  await storage.appendAuditLog(entry);
  return entry;
}

/**
 * Creates and appends an audit log entry for a reviewer's verdict decision
 */
export async function logVerdictRecorded(
  project: CockpitProject,
  verdict: VerdictDetails,
  actor: string
): Promise<AuditLogEntry> {
  const actionName =
    verdict.action === "pre_approve"
      ? "Pre-approved"
      : verdict.action === "reject"
      ? "Rejected"
      : "Flagged for Fraud";

  const diffs: FieldDiff[] = [
    {
      field: "cockpitStatus",
      oldValue: project.cockpitStatus,
      newValue:
        verdict.action === "pre_approve"
          ? "pre_approved"
          : verdict.action === "reject"
          ? "rejected"
          : "flagged_fraud",
    },
    {
      field: "approvedHours",
      oldValue: project.cockpitVerdict?.approvedHours ?? 0,
      newValue: verdict.approvedHours,
    },
  ];

  const entry: AuditLogEntry = {
    id: randomUUID(),
    projectId: project.id,
    liveRecordId: project.liveRecordId,
    timestamp: new Date().toISOString(),
    source: "cockpit_reviewer",
    actor,
    action: "verdict_recorded",
    diffs,
    summary: `${actionName} with ${verdict.approvedHours}h (deflated ${verdict.deflatedHours}h) by ${actor}`,
    metadata: {
      verdict,
    },
  };

  await storage.appendAuditLog(entry);
  return entry;
}

/**
 * Creates and appends an audit log entry for internal reviewer notes
 */
export async function logNoteAdded(
  project: CockpitProject,
  note: string,
  actor: string
): Promise<AuditLogEntry> {
  const entry: AuditLogEntry = {
    id: randomUUID(),
    projectId: project.id,
    liveRecordId: project.liveRecordId,
    timestamp: new Date().toISOString(),
    source: "cockpit_reviewer",
    actor,
    action: "note_added",
    diffs: [],
    summary: `Note added by ${actor}: ${note.slice(0, 80)}${note.length > 80 ? "..." : ""}`,
    metadata: { note },
  };

  await storage.appendAuditLog(entry);
  return entry;
}
