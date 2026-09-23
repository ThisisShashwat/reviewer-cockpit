/**
 * Canonical Types for Hack Club Reviewer Cockpit Server
 * 
 * Defines schemas for:
 * 1. RawLiveSubmissionDump: Payload received from Live admin export
 * 2. CockpitProject: Normalized internal project model
 * 3. AuditLogEntry: Append-only ledger of field changes and reviews
 * 4. VerdictEntry: Formal reviewer pre-check and admin decision record
 */

export type ProjectType = "software" | "hardware";

export type CockpitStatus = 
  | "pending"        // Awaiting first-pass reviewer
  | "in_review"      // Open in a reviewer session
  | "pre_approved"   // Approved by reviewer, waiting for admin copy/paste
  | "rejected"       // Rejected by reviewer or admin
  | "flagged_fraud"; // Flagged for suspicious activity / bot script

export type LiveReviewStatus = "Pending" | "Rejected" | "Fraud" | string;

/**
 * Raw submission record received from Live Admin dashboard bulk dump.
 * Accommodates either standard Airtable record shape { id, fields: { ... } }
 * or pre-flattened JSON objects.
 */
export interface RawLiveSubmissionDump {
  id: string; // Airtable Record ID (e.g. recXXXXXXXXXXXXXX)
  createdTime?: string;
  fields?: Record<string, any>;
  
  // Flattened alternatives:
  codeUrl?: string;
  playableUrl?: string;
  description?: string;
  githubUsername?: string;
  screenshot?: any;
  overrideHours?: number;
  overrideHoursJustification?: string;
  hackatimeId?: string;
  hackatimeProjects?: string;
  lapseLinks?: string | string[];
  approved?: boolean;
  reviewStatus?: LiveReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerVerdict?: string;
  reviewerJustification?: string;
  reviewerHours?: number;
  reviewerReviewedBy?: string;
  reviewerReviewedAt?: string;
  projectName?: string;
  projectType?: ProjectType;
  submittedAt?: string;
  messages?: Array<{ sender: string; message: string; sentAt?: string }>;
}

/**
 * Single field change between old and new state
 */
export interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * Immutable audit log record. Every sync and reviewer action produces an entry.
 */
export interface AuditLogEntry {
  id: string; // UUID
  projectId: string;
  liveRecordId: string;
  timestamp: string; // ISO 8601
  source: "live_sync" | "cockpit_reviewer" | "cockpit_admin";
  actor: string; // reviewer name, admin name, or "sync_agent"
  action: 
    | "project_created"
    | "project_updated"
    | "verdict_recorded"
    | "verdict_updated"
    | "status_changed"
    | "note_added";
  diffs: FieldDiff[];
  summary: string;
  metadata?: Record<string, any>;
}

/**
 * Reviewer decision details
 */
export interface VerdictDetails {
  action: "pre_approve" | "reject" | "flag_fraud";
  approvedHours: number;
  deflatedHours: number; // submittedHours - approvedHours (>= 0)
  hoursJustification: string;
  publicFeedback: string;
  internalNotes: string;
  appliedChecklist: Record<string, boolean>;
  reviewerName: string;
  decidedAt: string; // ISO 8601
}

/**
 * Canonical normalized project record in Cockpit
 */
export interface CockpitProject {
  id: string; // Internal Cockpit ID (defaults to liveRecordId)
  liveRecordId: string;
  projectName: string;
  projectType: ProjectType;
  codeUrl: string;
  playableUrl: string;
  description: string;
  githubUsername: string;
  screenshotUrl?: string;

  // Tracked / Requested Hours
  submittedHours: number;
  overrideHoursJustification?: string;
  hackatimeId?: string;
  hackatimeProjects?: string;
  lapseLinks: string[];

  // Live Airtable current state
  liveApproved: boolean;
  liveReviewStatus: LiveReviewStatus;
  liveReviewedAt?: string;
  liveReviewedBy?: string;

  // Live Reviewer precheck state
  liveReviewerVerdict?: string;
  liveReviewerJustification?: string;
  liveReviewerHours?: number;
  liveReviewerReviewedBy?: string;
  liveReviewerReviewedAt?: string;

  // Cockpit workflow state
  cockpitStatus: CockpitStatus;
  cockpitVerdict?: VerdictDetails;

  // Metadata & Timestamps
  submittedAt: string;
  firstSyncedAt: string;
  lastSyncedAt: string;
  updatedAt: string;
  version: number;
  changeCount: number;

  // Telemetry caching (Hackatime API, etc.)
  telemetryCache?: {
    totalSeconds?: number;
    aiSeconds?: number;
    editorDistribution?: Record<string, number>;
    languages?: Record<string, number>;
    fetchedAt?: string;
  };
}

/**
 * Request payload when submitting a verdict in Cockpit
 */
export interface SubmitVerdictRequest {
  projectId: string;
  action: "pre_approve" | "reject" | "flag_fraud";
  approvedHours: number;
  deflatedHours?: number;
  hoursJustification: string;
  publicFeedback?: string;
  internalNotes?: string;
  appliedChecklist?: Record<string, boolean>;
  reviewerName?: string;
}

/**
 * Export format for admin 1-click clipboard copy
 */
export interface PreapprovedExportItem {
  projectId: string;
  liveRecordId: string;
  projectName: string;
  githubUsername: string;
  codeUrl: string;
  playableUrl: string;
  approvedHours: number;
  recommendedVerdict: "approve" | "reject";
  justification: string;
  decidedAt: string;
  reviewerName: string;
  clipboardText: string;
}

/**
 * Queue statistics summary
 */
export interface QueueStats {
  total: number;
  pending: number;
  inReview: number;
  preApproved: number;
  rejected: number;
  flaggedFraud: number;
  totalApprovedHours: number;
  averageApprovedHours: number;
}
