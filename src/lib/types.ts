/**
 * Core type definitions for Reviewer Cockpit
 * 100% Real-data driven, zero-simulation client-side operations.
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
  status: string; // added, modified, removed
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
  isLoading: boolean;
  error?: string;
}

export interface HackatimeProjectStats {
  username: string;
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
