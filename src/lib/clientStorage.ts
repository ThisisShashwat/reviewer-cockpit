/**
 * Standalone Client-Side Storage Engine for GitHub Pages & Offline Operations
 * 
 * Provides 100% full-fidelity Cockpit operations without an Express backend:
 * - Loads static snapshot (projects.json, verdicts.json, audit_log.json) from public/data
 * - Persists all verdicts, notes, ingested projects, and status changes in browser localStorage
 * - Formats full GitBook-compliant clipboard justifications for the Pre-Approved Desk
 * - Generates downloadable JSON backup snapshots
 */

import {
  AuditLogEntry,
  CockpitProject,
  PreapprovedExportItem,
  QueueStats,
  SubmitVerdictRequest,
  UserNote,
  VerdictDetails,
} from './types';

const STORAGE_KEYS = {
  VERDICTS: 'HC_LOCAL_VERDICTS',
  PROJECT_OVERRIDES: 'HC_LOCAL_OVERRIDES',
  ADDED_PROJECTS: 'HC_LOCAL_ADDED_PROJECTS',
  AUDIT_LOGS: 'HC_LOCAL_AUDIT_LOGS',
  USER_NOTES: 'HC_LOCAL_USER_NOTES',
  IS_INITIALIZED: 'HC_LOCAL_INITIALIZED',
};

// In-memory runtime state
let isInitialized = false;
let initPromise: Promise<void> | null = null;

let memoryProjects: CockpitProject[] = [];
let memoryVerdicts: Record<string, VerdictDetails> = {};
let memoryAuditLogs: AuditLogEntry[] = [];
let memoryUserNotes: Record<string, UserNote[]> = {};

/**
 * Safely parse JSON from localStorage
 */
function getStorageItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`[clientStorage] Failed to read ${key} from localStorage:`, e);
    return fallback;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`[clientStorage] Failed to save ${key} to localStorage (quota exceeded?):`, e);
  }
}

/**
 * Compute real-time queue stats from project list
 */
export function computeQueueStats(projects: CockpitProject[]): QueueStats {
  let pending = 0;
  let inReview = 0;
  let preApproved = 0;
  let completedPreApproved = 0;
  let approved = 0;
  let rejected = 0;
  let flaggedFraud = 0;
  let totalApprovedHours = 0;

  for (const p of projects) {
    switch (p.cockpitStatus) {
      case 'pending':
        pending++;
        break;
      case 'in_review':
        inReview++;
        break;
      case 'pre_approved':
        preApproved++;
        if (p.cockpitVerdict?.approvedHours) {
          totalApprovedHours += p.cockpitVerdict.approvedHours;
        } else if (p.submittedHours) {
          totalApprovedHours += p.submittedHours;
        }
        break;
      case 'completed_pre_approved':
        completedPreApproved++;
        if (p.cockpitVerdict?.approvedHours) {
          totalApprovedHours += p.cockpitVerdict.approvedHours;
        } else if (p.submittedHours) {
          totalApprovedHours += p.submittedHours;
        }
        break;
      case 'approved':
        approved++;
        if (p.cockpitVerdict?.approvedHours) {
          totalApprovedHours += p.cockpitVerdict.approvedHours;
        } else if (p.submittedHours) {
          totalApprovedHours += p.submittedHours;
        }
        break;
      case 'rejected':
        rejected++;
        break;
      case 'flagged_fraud':
        flaggedFraud++;
        break;
    }
  }

  const averageApprovedHours =
    preApproved > 0 ? Math.round((totalApprovedHours / preApproved) * 10) / 10 : 0;

  return {
    total: projects.length,
    pending,
    inReview,
    preApproved,
    completedPreApproved,
    approved,
    rejected,
    flaggedFraud,
    totalApprovedHours: Math.round(totalApprovedHours * 10) / 10,
    averageApprovedHours,
  };
}

/**
 * Initializes client storage by loading public static datasets and merging with localStorage
 */
export async function initClientStorage(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

      // 1. Fetch static base datasets
      let baseProjects: CockpitProject[] = [];
      let baseVerdicts: Record<string, VerdictDetails> = {};
      let baseAuditLogs: AuditLogEntry[] = [];

      try {
        const pRes = await fetch(`${cleanBase}data/projects.json`);
        if (pRes.ok) baseProjects = await pRes.json();
      } catch (err) {
        console.warn('[clientStorage] Could not fetch static projects.json:', err);
      }

      try {
        const vRes = await fetch(`${cleanBase}data/verdicts.json`);
        if (vRes.ok) baseVerdicts = await vRes.json();
      } catch (err) {
        console.warn('[clientStorage] Could not fetch static verdicts.json:', err);
      }

      try {
        const aRes = await fetch(`${cleanBase}data/audit_log.json`);
        if (aRes.ok) baseAuditLogs = await aRes.json();
      } catch (err) {
        console.warn('[clientStorage] Could not fetch static audit_log.json:', err);
      }

      // 2. Read local overrides and user actions from localStorage
      const localVerdicts = getStorageItem<Record<string, VerdictDetails>>(STORAGE_KEYS.VERDICTS, {});
      const localOverrides = getStorageItem<Record<string, Partial<CockpitProject>>>(STORAGE_KEYS.PROJECT_OVERRIDES, {});
      const localAdded = getStorageItem<CockpitProject[]>(STORAGE_KEYS.ADDED_PROJECTS, []);
      const localAuditLogs = getStorageItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
      const localUserNotes = getStorageItem<Record<string, UserNote[]>>(STORAGE_KEYS.USER_NOTES, {});

      // 3. Merge verdicts
      memoryVerdicts = { ...baseVerdicts, ...localVerdicts };

      // 4. Merge projects
      const projectMap = new Map<string, CockpitProject>();
      for (const p of baseProjects) {
        projectMap.set(p.id, { ...p });
      }

      // Apply locally added projects
      for (const p of localAdded) {
        projectMap.set(p.id, { ...p });
      }

      // Apply local verdicts and overrides to project state
      for (const [id, project] of projectMap.entries()) {
        const verdict = memoryVerdicts[id];
        if (verdict) {
          project.cockpitVerdict = verdict;
          if (!project.cockpitStatus || project.cockpitStatus === 'pending') {
            project.cockpitStatus = 'pre_approved';
          }
        }
        const override = localOverrides[id];
        if (override) {
          Object.assign(project, override);
        }
      }

      memoryProjects = Array.from(projectMap.values());
      memoryAuditLogs = [...localAuditLogs, ...baseAuditLogs];
      memoryUserNotes = localUserNotes;

      isInitialized = true;
      console.log(`[clientStorage] Initialized with ${memoryProjects.length} projects, ${Object.keys(memoryVerdicts).length} verdicts, ${memoryAuditLogs.length} audit logs.`);
    } catch (err) {
      console.error('[clientStorage] Initialization failed:', err);
    }
  })();

  return initPromise;
}

/**
 * Get filtered projects and computed queue stats
 */
export async function clientGetProjects(filters?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<{ projects: CockpitProject[]; stats: QueueStats }> {
  await initClientStorage();

  let list = memoryProjects;

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((p) => p.cockpitStatus === filters.status);
  }

  if (filters?.type && filters.type !== 'all') {
    list = list.filter((p) => p.projectType === filters.type);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        (p.projectName && p.projectName.toLowerCase().includes(q)) ||
        (p.githubUsername && p.githubUsername.toLowerCase().includes(q)) ||
        (p.hackatimeId && p.hackatimeId.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q))
    );
  }

  const stats = computeQueueStats(memoryProjects);
  return { projects: list, stats };
}

/**
 * Get single project with audit history and verdict
 */
export async function clientGetProject(id: string): Promise<{
  project: CockpitProject;
  auditHistory: AuditLogEntry[];
  verdict?: VerdictDetails;
}> {
  await initClientStorage();

  const project = memoryProjects.find((p) => p.id === id || p.liveRecordId === id);
  if (!project) throw new Error(`Project ${id} not found in client storage`);

  const auditHistory = memoryAuditLogs.filter(
    (log) => log.projectId === id || log.liveRecordId === id
  );

  const verdict = memoryVerdicts[project.id] || project.cockpitVerdict;

  return { project, auditHistory, verdict };
}

/**
 * Submit verdict in client storage
 */
export async function clientSubmitVerdict(
  payload: SubmitVerdictRequest
): Promise<{
  ok: boolean;
  verdict: VerdictDetails;
  project: CockpitProject;
  stats: QueueStats;
}> {
  await initClientStorage();

  const projectIndex = memoryProjects.findIndex(
    (p) => p.id === payload.projectId || p.liveRecordId === payload.projectId
  );
  if (projectIndex === -1) throw new Error(`Project ${payload.projectId} not found`);

  const project = memoryProjects[projectIndex];

  const verdict: VerdictDetails = {
    action: payload.action,
    approvedHours: payload.approvedHours,
    deflatedHours: payload.deflatedHours ?? 0,
    hoursJustification: payload.hoursJustification || '',
    publicFeedback: payload.publicFeedback || '',
    internalNotes: payload.internalNotes || '',
    appliedChecklist: payload.appliedChecklist || {},
    checklistNotes: payload.checklistNotes,
    reviewerName: payload.reviewerName || 'Reviewer',
    decidedAt: new Date().toISOString(),
  };

  // Update in-memory
  memoryVerdicts[project.id] = verdict;
  project.cockpitVerdict = verdict;
  project.cockpitStatus = 'pre_approved';
  project.updatedAt = new Date().toISOString();
  memoryProjects[projectIndex] = project;

  // Persist to localStorage
  const localVerdicts = getStorageItem<Record<string, VerdictDetails>>(STORAGE_KEYS.VERDICTS, {});
  localVerdicts[project.id] = verdict;
  setStorageItem(STORAGE_KEYS.VERDICTS, localVerdicts);

  const localOverrides = getStorageItem<Record<string, Partial<CockpitProject>>>(STORAGE_KEYS.PROJECT_OVERRIDES, {});
  localOverrides[project.id] = {
    cockpitStatus: 'pre_approved',
    cockpitVerdict: verdict,
    updatedAt: project.updatedAt,
  };
  setStorageItem(STORAGE_KEYS.PROJECT_OVERRIDES, localOverrides);

  // Append audit log
  const auditEntry: AuditLogEntry = {
    id: `log-verdict-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId: project.id,
    liveRecordId: project.liveRecordId,
    timestamp: new Date().toISOString(),
    source: 'cockpit_reviewer',
    actor: payload.reviewerName || 'Reviewer',
    action: 'verdict_recorded',
    diffs: [],
    summary: `Verdict recorded: ${verdict.action.toUpperCase()} (${verdict.approvedHours} hrs).`,
    metadata: { verdict },
  };

  memoryAuditLogs.unshift(auditEntry);
  const localAuditLogs = getStorageItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  localAuditLogs.unshift(auditEntry);
  setStorageItem(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs.slice(0, 500)); // cap at 500

  const stats = computeQueueStats(memoryProjects);
  return { ok: true, verdict, project, stats };
}

/**
 * Mark project as completed in pre-approved queue
 */
export async function clientMarkCompletedPreApproved(
  projectId: string
): Promise<{ ok: boolean; project: CockpitProject; stats: QueueStats }> {
  await initClientStorage();

  const projectIndex = memoryProjects.findIndex(
    (p) => p.id === projectId || p.liveRecordId === projectId
  );
  if (projectIndex === -1) throw new Error(`Project ${projectId} not found`);

  const project = memoryProjects[projectIndex];
  project.cockpitStatus = 'completed_pre_approved';
  project.updatedAt = new Date().toISOString();
  memoryProjects[projectIndex] = project;

  // Persist override
  const localOverrides = getStorageItem<Record<string, Partial<CockpitProject>>>(STORAGE_KEYS.PROJECT_OVERRIDES, {});
  localOverrides[project.id] = {
    ...(localOverrides[project.id] || {}),
    cockpitStatus: 'completed_pre_approved',
    updatedAt: project.updatedAt,
  };
  setStorageItem(STORAGE_KEYS.PROJECT_OVERRIDES, localOverrides);

  const stats = computeQueueStats(memoryProjects);
  return { ok: true, project, stats };
}

/**
 * Save project note
 */
export async function clientSaveProjectNote(
  id: string,
  note: string,
  actor = 'reviewer'
): Promise<{ ok: boolean; entry: AuditLogEntry }> {
  await initClientStorage();

  const project = memoryProjects.find((p) => p.id === id || p.liveRecordId === id);
  const entry: AuditLogEntry = {
    id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    projectId: project ? project.id : id,
    liveRecordId: project ? project.liveRecordId : id,
    timestamp: new Date().toISOString(),
    source: 'cockpit_reviewer',
    actor,
    action: 'note_added',
    diffs: [],
    summary: `Note added by ${actor}: ${note.length > 80 ? note.slice(0, 80) + '...' : note}`,
    metadata: { note },
  };

  memoryAuditLogs.unshift(entry);
  const localAuditLogs = getStorageItem<AuditLogEntry[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  localAuditLogs.unshift(entry);
  setStorageItem(STORAGE_KEYS.AUDIT_LOGS, localAuditLogs.slice(0, 500));

  return { ok: true, entry };
}

/**
 * Save persistent user note
 */
export async function clientSaveUserNote(
  username: string,
  note: string,
  actor = 'Reviewer'
): Promise<{ ok: boolean; note: UserNote }> {
  await initClientStorage();
  const clean = username.trim().toLowerCase();
  const newNote: UserNote = {
    id: `unote-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    text: note,
    author: actor,
    createdAt: new Date().toISOString(),
  };

  if (!memoryUserNotes[clean]) memoryUserNotes[clean] = [];
  memoryUserNotes[clean].unshift(newNote);

  const localNotes = getStorageItem<Record<string, UserNote[]>>(STORAGE_KEYS.USER_NOTES, {});
  if (!localNotes[clean]) localNotes[clean] = [];
  localNotes[clean].unshift(newNote);
  setStorageItem(STORAGE_KEYS.USER_NOTES, localNotes);

  return { ok: true, note: newNote };
}

/**
 * Fetch persistent user notes
 */
export async function clientFetchUserNotes(username: string): Promise<UserNote[]> {
  await initClientStorage();
  const clean = username.trim().toLowerCase();
  return memoryUserNotes[clean] || [];
}

/**
 * Quick Ingest single project in client mode
 */
export async function clientQuickIngest(payload: any): Promise<{
  ok: boolean;
  project: CockpitProject;
  stats: QueueStats;
}> {
  await initClientStorage();

  const id = payload.id || `rec_quick_${Date.now()}`;
  const newProject: CockpitProject = {
    id,
    liveRecordId: payload.liveRecordId || id,
    projectName: payload.projectName || 'Quick Ingest Project',
    projectType: payload.projectType || 'software',
    codeUrl: payload.codeUrl || '',
    playableUrl: payload.playableUrl || '',
    description: payload.description || '',
    githubUsername: payload.githubUsername || '',
    submittedHours: Number(payload.submittedHours) || 0,
    hackatimeId: payload.hackatimeId || '',
    hackatimeProjects: payload.hackatimeProjects || '',
    lapseLinks: payload.lapseLinks || [],
    liveApproved: false,
    liveReviewStatus: 'Pending',
    cockpitStatus: 'pending',
    submittedAt: new Date().toISOString(),
    firstSyncedAt: new Date().toISOString(),
    lastSyncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    changeCount: 0,
  };

  memoryProjects.unshift(newProject);

  const localAdded = getStorageItem<CockpitProject[]>(STORAGE_KEYS.ADDED_PROJECTS, []);
  localAdded.unshift(newProject);
  setStorageItem(STORAGE_KEYS.ADDED_PROJECTS, localAdded);

  const stats = computeQueueStats(memoryProjects);
  return { ok: true, project: newProject, stats };
}

/**
 * Formats a clean commit breakdown string for copy-pasting
 */
function formatCommitsSummary(
  codeCount: number,
  cosmeticCount: number = 0,
  boilerplateCount: number = 0
): string {
  const total = codeCount + cosmeticCount + boilerplateCount;
  if (total === 0) return '0 code related commits';

  const codeRatio = codeCount / total;
  const isHighCodeConcentration = codeRatio >= 0.9;
  const nonCodeCount = cosmeticCount + boilerplateCount;

  if (isHighCodeConcentration && nonCodeCount / total < 0.1) {
    return `${codeCount} code related commit${codeCount === 1 ? '' : 's'}`;
  }

  const parts = [`${codeCount} code related commit${codeCount === 1 ? '' : 's'}`];
  const cosmeticRatio = cosmeticCount / total;
  const shouldOmitCosmetic =
    cosmeticCount <= 2 || (isHighCodeConcentration && cosmeticRatio < 0.1);

  if (!shouldOmitCosmetic && cosmeticCount > 0) {
    parts.push(`${cosmeticCount} cosmetic commit${cosmeticCount === 1 ? '' : 's'}`);
  }

  const boilerplateRatio = boilerplateCount / total;
  const shouldOmitBoilerplate =
    boilerplateCount <= 2 || (isHighCodeConcentration && boilerplateRatio < 0.1);

  if (!shouldOmitBoilerplate && boilerplateCount > 0) {
    parts.push(`${boilerplateCount} boilerplate commit${boilerplateCount === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}

/**
 * Formats standardized GitBook-compliant justification string for admin clipboard
 */
export function formatClipboardJustification(project: CockpitProject, verdict: VerdictDetails): string {
  const lines: string[] = [];

  lines.push(`Project: ${project.projectName || 'Unnamed'}`);
  lines.push(`Hackatime ID: ${project.hackatimeId || project.id || 'N/A'}`);

  const applied = verdict.appliedChecklist || {};
  const expMap: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    highly_experienced: 'Highly Experienced / Pro',
  };
  const currentExp = applied.submitter_experience_level;
  if (currentExp && currentExp.toLowerCase() !== 'uncalibrated') {
    const expText = expMap[currentExp] || currentExp;
    lines.push(`Experience: ${expText}`);
  }

  const shippedFailures: string[] = [];
  if (applied.shipped_name_valid === false) shippedFailures.push('Missing project title');
  if (applied.shipped_code_valid === false) shippedFailures.push('Missing GitHub repository');
  if (applied.shipped_desc_valid === false) shippedFailures.push('Missing description');
  if (applied.shipped_screenshot_valid === false) shippedFailures.push('Missing deliverable screenshot');
  if (applied.shipped_readme_status === 'fail' || applied.shipped_readme_valid === false) {
    shippedFailures.push('Missing README');
  } else if (applied.shipped_readme_status === 'low_quality') {
    shippedFailures.push('Low quality README');
  } else if (applied.shipped_readme_status === 'ai_generated') {
    shippedFailures.push('AI-generated README');
  }
  if (applied.shipped_playable_status === 'disallowed_host' || applied.shipped_host_compliant === false) {
    shippedFailures.push('Disallowed host: Streamlit/Replit/Drive');
  } else if (applied.shipped_playable_status === 'broken') {
    shippedFailures.push('Playable demo broken/crashing');
  } else if (applied.shipped_playable_status === 'fail' || applied.shipped_playable_valid === false) {
    shippedFailures.push('Missing playable demo');
  } else if (applied.shipped_playable_status === 'needs_video') {
    shippedFailures.push('Video proof required');
  }

  if (shippedFailures.length === 0) {
    lines.push('Shipped: Yes');
  } else {
    lines.push(`Shipped: No (${shippedFailures.join(', ')})`);
  }

  let commitsSummary = applied.commits_summary;
  if (applied.code_commits_count !== undefined || applied.cosmetic_commits_count !== undefined) {
    commitsSummary = formatCommitsSummary(
      applied.code_commits_count || 0,
      applied.cosmetic_commits_count || 0,
      applied.boilerplate_commits_count || 0
    );
  } else if (!commitsSummary) {
    commitsSummary = '0 code related commits';
  }
  lines.push(`Commits: ${commitsSummary}`);

  const isDeflated =
    verdict.action === 'pre_approve' &&
    (verdict.approvedHours < project.submittedHours || (verdict.deflatedHours ?? 0) > 0);
  const verdictText =
    verdict.action === 'pre_approve'
      ? isDeflated
        ? `Accepted (deflated from ${project.submittedHours} hrs to ${verdict.approvedHours} hrs)`
        : 'Accepted'
      : verdict.action === 'flag_fraud'
      ? 'Rejected (Fraud)'
      : 'Rejected';
  lines.push(`Verdict: ${verdictText}`);

  if (verdict.hoursJustification && verdict.hoursJustification.trim()) {
    lines.push(`Notes: ${verdict.hoursJustification.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Fetch pre-approved items queue
 */
export async function clientGetPreapprovedQueue(): Promise<{
  items: PreapprovedExportItem[];
  count: number;
}> {
  await initClientStorage();

  const preApproved = memoryProjects.filter((p) => p.cockpitStatus === 'pre_approved');

  const items: PreapprovedExportItem[] = preApproved.map((p) => {
    const verdict = p.cockpitVerdict || {
      action: 'pre_approve' as const,
      approvedHours: p.submittedHours,
      deflatedHours: 0,
      hoursJustification: 'Approved without adjustments',
      publicFeedback: '',
      internalNotes: '',
      appliedChecklist: {},
      reviewerName: 'Reviewer',
      decidedAt: p.updatedAt,
    };

    return {
      projectId: p.id,
      liveRecordId: p.liveRecordId,
      projectName: p.projectName,
      githubUsername: p.githubUsername,
      codeUrl: p.codeUrl,
      playableUrl: p.playableUrl,
      approvedHours: verdict.approvedHours,
      recommendedVerdict: 'approve',
      justification: verdict.hoursJustification,
      decidedAt: verdict.decidedAt,
      reviewerName: verdict.reviewerName,
      clipboardText: formatClipboardJustification(p, verdict),
    };
  });

  return { items, count: items.length };
}

/**
 * Download complete snapshot as JSON file
 */
export function exportClientDataJson(): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    stats: computeQueueStats(memoryProjects),
    verdicts: memoryVerdicts,
    projects: memoryProjects,
    auditLogs: memoryAuditLogs,
    userNotes: memoryUserNotes,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute(
    'download',
    `reviewer_cockpit_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
