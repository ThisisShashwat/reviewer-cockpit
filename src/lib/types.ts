/**
 * Core type definitions for Reviewer Cockpit
 * 100% Real-data driven, zero-simulation operations.
 */

export type ProjectTrack = 'software' | 'hardware' | 'auto';

export interface SubmissionParams {
  codeUrl: string;
  playableUrl: string;
  track: 'software' | 'hardware';
  hours: string;
  hackatimeId: string;
  project: string;
  lapseLinks: string;
  recordId: string;
  description: string;
}

export type CockpitStatus =
  | 'pending'
  | 'in_review'
  | 'pre_approved'
  | 'rejected'
  | 'flagged_fraud';

export interface FieldDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLogEntry {
  id: string;
  projectId: string;
  liveRecordId: string;
  timestamp: string;
  source: 'live_sync' | 'cockpit_reviewer' | 'cockpit_admin';
  actor: string;
  action:
    | 'project_created'
    | 'project_updated'
    | 'verdict_recorded'
    | 'verdict_updated'
    | 'status_changed'
    | 'note_added';
  diffs: FieldDiff[];
  summary: string;
  metadata?: Record<string, any>;
}

export interface VerdictDetails {
  action: 'pre_approve' | 'reject' | 'flag_fraud';
  approvedHours: number;
  deflatedHours: number;
  hoursJustification: string;
  publicFeedback: string;
  internalNotes: string;
  appliedChecklist: Record<string, boolean>;
  reviewerName: string;
  decidedAt: string;
}

export interface CockpitProject {
  id: string;
  liveRecordId: string;
  projectName: string;
  projectType: 'software' | 'hardware';
  codeUrl: string;
  playableUrl: string;
  description: string;
  githubUsername: string;
  screenshotUrl?: string;

  submittedHours: number;
  overrideHoursJustification?: string;
  hackatimeId?: string;
  hackatimeProjects?: string;
  lapseLinks: string[];

  liveApproved: boolean;
  liveReviewStatus: string;
  liveReviewedAt?: string;
  liveReviewedBy?: string;

  liveReviewerVerdict?: string;
  liveReviewerJustification?: string;
  liveReviewerHours?: number;
  liveReviewerReviewedBy?: string;
  liveReviewerReviewedAt?: string;

  cockpitStatus: CockpitStatus;
  cockpitVerdict?: VerdictDetails;

  submittedAt: string;
  firstSyncedAt: string;
  lastSyncedAt: string;
  updatedAt: string;
  version: number;
  changeCount: number;

  telemetryCache?: {
    totalSeconds?: number;
    aiSeconds?: number;
    editorDistribution?: Record<string, number>;
    languages?: Record<string, number>;
    fetchedAt?: string;
  };
}

export interface SubmitVerdictRequest {
  projectId: string;
  action: 'pre_approve' | 'reject' | 'flag_fraud';
  approvedHours: number;
  deflatedHours?: number;
  hoursJustification: string;
  publicFeedback?: string;
  internalNotes?: string;
  appliedChecklist?: Record<string, boolean>;
  reviewerName?: string;
}

export interface PreapprovedExportItem {
  projectId: string;
  liveRecordId: string;
  projectName: string;
  githubUsername: string;
  codeUrl: string;
  playableUrl: string;
  approvedHours: number;
  recommendedVerdict: 'approve' | 'reject';
  justification: string;
  decidedAt: string;
  reviewerName: string;
  clipboardText: string;
}

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

export type LinkCategory = 'lapse' | 'video' | 'journal' | 'code' | 'other';

export interface ParsedLink {
  id: string;
  url: string;
  category: LinkCategory;
  title: string;
  isEmbeddable: boolean;
  embedUrl?: string;
  note?: string;
}

export interface PlayableValidation {
  isCodeDuplicate: boolean;
  isProhibitedHost: boolean;
  prohibitedReason?: string;
  isCliScript: boolean;
  embedType: 'iframe' | 'youtube' | 'video' | 'external';
  embedUrl?: string;
  warnings: string[];
}

export interface CommitFileChange {
  filename: string;
  additions: number;
  deletions: number;
  status: string;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
  additions?: number;
  deletions?: number;
  files?: CommitFileChange[];
}

export interface GitHubRepoFile {
  name: string;
  path: string;
  size: number;
  type: 'file' | 'dir';
}

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
}

export interface GitHubRelease {
  id: number;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  assets: GitHubReleaseAsset[];
}

export interface GitHubRepoData {
  owner: string;
  repo: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string;
  license?: string;
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  commits: GitHubCommit[];
  files: GitHubRepoFile[];
  releases: GitHubRelease[];
  hardwareFiles: GitHubRepoFile[];
  readmeContent?: string;
  isRateLimited?: boolean;
  isLoading: boolean;
  error?: string;
}

export interface HackatimeProjectStats {
  username: string;
  projectName?: string;
  projectHoursReadable?: string;
  projectSeconds?: number;
  isProjectFound: boolean;
  totalSeconds: number;
  totalHoursReadable: string;
  projects: string[];
  languages: Array<{
    name: string;
    text: string;
    hours: number;
    percent: number;
    color?: string;
  }>;
  lifetimeLanguages?: Array<{
    name: string;
    text: string;
    hours: number;
    percent: number;
    color?: string;
  }>;
  isLoading: boolean;
  error?: string;
}

export interface HalceonShipLink {
  label: string;
  url: string;
  isArchive: boolean;
  type: 'repo' | 'demo' | 'archive_repo' | 'archive_demo' | 'image' | 'other';
}

export interface HalceonShip {
  repo: string;
  program: string;
  description: string;
  hours: number;
  approvedAt: string;
  links: string[];
  parsedLinks?: HalceonShipLink[];
}

export interface HalceonProfileData {
  username: string;
  totalShips: number;
  totalHours: number;
  ships: HalceonShip[];
  isLoading: boolean;
  error?: string;
}

export interface ManifestSubmission {
  submissionId: string;
  yswsName: string | null;
  shipStatus: string;
  hoursShipped: number | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface ManifestLookupData {
  isLoading: boolean;
  isRegistered: boolean;
  otherSubmissions: ManifestSubmission[];
  halceonUrl: string;
  error?: string;
}

export interface RuleCheckResult {
  id: string;
  title: string;
  severity: 'blocker' | 'warning' | 'pass';
  message: string;
  detail?: string;
}
