import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AuditLogEntry,
  CockpitProject,
  QueueStats,
  VerdictDetails,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const AUDIT_LOG_FILE = path.join(DATA_DIR, "audit_log.json");
const VERDICTS_FILE = path.join(DATA_DIR, "verdicts.json");
const BACKUP_DIR = path.resolve(DATA_DIR, "permanent_backups");

/**
 * StorageManager provides durable, atomic file-backed JSON storage
 * with an in-memory cache for ultra-fast queries.
 */
export class StorageManager {
  private projects: Map<string, CockpitProject> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private verdicts: Map<string, VerdictDetails> = new Map();
  private lastBackupCount = 0;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(DATA_DIR, { recursive: true });

    // Load projects
    try {
      const data = await fs.readFile(PROJECTS_FILE, "utf-8");
      const list: CockpitProject[] = JSON.parse(data);
      for (const p of list) {
        this.projects.set(p.id, p);
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") console.error("Error reading projects.json:", err);
      this.projects = new Map();
    }

    // Load audit logs
    try {
      const data = await fs.readFile(AUDIT_LOG_FILE, "utf-8");
      this.auditLogs = JSON.parse(data);
    } catch (err: any) {
      if (err.code !== "ENOENT") console.error("Error reading audit_log.json:", err);
      this.auditLogs = [];
    }

    // Load verdicts
    try {
      const data = await fs.readFile(VERDICTS_FILE, "utf-8");
      const obj: Record<string, VerdictDetails> = JSON.parse(data);
      for (const [k, v] of Object.entries(obj)) {
        this.verdicts.set(k, v);
      }
    } catch (err: any) {
      if (err.code !== "ENOENT") console.error("Error reading verdicts.json:", err);
      this.verdicts = new Map();
    }

    // Set up permanent backup directory
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const readmePath = path.join(BACKUP_DIR, "README.md");
    try {
      await fs.access(readmePath);
    } catch {
      await fs.writeFile(
        readmePath,
        "# Permanent Automated Prereview Backups\n\nCRITICAL: DO NOT DELETE THIS DIRECTORY OR ITS FILES.\n\nEvery 5 prereviews completed in the Horizons Reviewer Cockpit, an immutable JSON snapshot is generated and preserved here.\n",
        "utf-8"
      );
    }

    // Initialize lastBackupCount to current multiple of 5
    this.lastBackupCount = Math.floor(this.verdicts.size / 5) * 5;

    this.initialized = true;
    console.log(
      `[StorageManager] Initialized. Loaded ${this.projects.size} projects, ${this.auditLogs.length} audit logs, ${this.verdicts.size} verdicts. (Last backup milestone: ${this.lastBackupCount})`
    );
  }

  /**
   * Atomically write JSON data to file via temp file replacement
   */
  private async atomicWriteFile(filePath: string, data: any): Promise<void> {
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, serialized, "utf-8");
    await fs.rename(tempPath, filePath);
  }

  // ---- PROJECTS ----

  getAllProjects(): CockpitProject[] {
    return Array.from(this.projects.values());
  }

  getProject(id: string): CockpitProject | undefined {
    return this.projects.get(id);
  }

  async saveProject(project: CockpitProject): Promise<void> {
    this.projects.set(project.id, project);
    await this.persistProjects();
  }

  async saveProjects(projects: CockpitProject[]): Promise<void> {
    for (const p of projects) {
      this.projects.set(p.id, p);
    }
    await this.persistProjects();
  }

  private async persistProjects(): Promise<void> {
    const list = Array.from(this.projects.values());
    await this.atomicWriteFile(PROJECTS_FILE, list);
  }

  // ---- AUDIT LOGS (Append-Only) ----

  async appendAuditLog(entry: AuditLogEntry): Promise<void> {
    this.auditLogs.push(entry);
    await this.persistAuditLogs();
  }

  async appendAuditLogs(entries: AuditLogEntry[]): Promise<void> {
    if (entries.length === 0) return;
    this.auditLogs.push(...entries);
    await this.persistAuditLogs();
  }

  getAuditLogs(projectId?: string): AuditLogEntry[] {
    if (!projectId) {
      return [...this.auditLogs].reverse();
    }
    return this.auditLogs
      .filter((log) => log.projectId === projectId || log.liveRecordId === projectId)
      .reverse();
  }

  private async persistAuditLogs(): Promise<void> {
    await this.atomicWriteFile(AUDIT_LOG_FILE, this.auditLogs);
  }

  // ---- VERDICTS ----

  async saveVerdict(
    projectId: string,
    verdict: VerdictDetails
  ): Promise<{
    project: CockpitProject | undefined;
    backupInfo?: { created: boolean; filename: string; filePath: string; milestone: number };
  }> {
    this.verdicts.set(projectId, verdict);
    const obj = Object.fromEntries(this.verdicts.entries());
    await this.atomicWriteFile(VERDICTS_FILE, obj);

    // Also update project's cockpitStatus and cockpitVerdict
    const project = this.projects.get(projectId);
    if (project) {
      project.cockpitVerdict = verdict;
      // All first-pass cockpit reviews move to pre_approved queue
      project.cockpitStatus = "pre_approved";
      project.updatedAt = new Date().toISOString();
      await this.saveProject(project);
    }

    // Check and trigger automated permanent backup every 5 completed prereviews
    let backupInfo;
    try {
      const backupResult = await this.checkAndTriggerAutomatedBackup();
      if (backupResult) {
        backupInfo = backupResult;
      }
    } catch (backupErr) {
      console.error("[StorageManager] Automated backup check failed:", backupErr);
    }

    return { project, backupInfo };
  }

  /**
   * Checks if prereviews count has hit a multiple of 5 and generates a permanent backup
   */
  async checkAndTriggerAutomatedBackup(): Promise<{
    created: boolean;
    filename: string;
    filePath: string;
    milestone: number;
  } | null> {
    const prereviewCount = this.verdicts.size;
    if (prereviewCount > 0 && prereviewCount % 5 === 0 && prereviewCount > this.lastBackupCount) {
      this.lastBackupCount = prereviewCount;
      const backup = await this.createPermanentBackup(prereviewCount);
      return {
        created: true,
        filename: backup.filename,
        filePath: backup.filePath,
        milestone: prereviewCount,
      };
    }
    return null;
  }

  /**
   * Creates an immutable, write-protected snapshot of all projects, verdicts, and audit logs.
   * Stored in permanent_backups/ and protected against deletion.
   */
  async createPermanentBackup(milestone: number): Promise<{ filename: string; filePath: string }> {
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `prereviews_checkpoint_${milestone}_reviews_${timestamp}.json`;
    const filePath = path.join(BACKUP_DIR, filename);

    const backupPayload = {
      _notice: "PERMANENT AUTOMATED SNAPSHOT - DO NOT DELETE - GENERATED BY HORIZONS REVIEWER COCKPIT",
      milestoneReviewsCount: milestone,
      createdAt: new Date().toISOString(),
      totalProjectsInCockpit: this.projects.size,
      totalVerdicts: this.verdicts.size,
      totalAuditLogs: this.auditLogs.length,
      verdicts: Object.fromEntries(this.verdicts.entries()),
      projects: Array.from(this.projects.values()),
      auditLogs: this.auditLogs,
    };

    const tempPath = `${filePath}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(backupPayload, null, 2), "utf-8");
    await fs.rename(tempPath, filePath);

    // Write-protect file (read-only for all: r--r--r--) so it can never be accidentally modified
    try {
      await fs.chmod(filePath, 0o444);
    } catch (chmodErr) {
      console.warn("[StorageManager] Could not set read-only permissions on backup:", chmodErr);
    }

    console.log(
      `[StorageManager] 🛡️ Permanent automated backup generated at ${milestone} prereviews: ${filename}`
    );

    // Append to audit log
    await this.appendAuditLog({
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: "system",
      liveRecordId: "system",
      timestamp: new Date().toISOString(),
      source: "cockpit_admin",
      actor: "AutomatedBackupDaemon",
      action: "note_added",
      diffs: [],
      summary: `Automated permanent backup created at ${milestone} prereviews completed: ${filename}`,
      metadata: { filePath, filename, milestone },
    });

    return { filename, filePath };
  }

  /**
   * Returns list of all permanent backups generated so far
   */
  async getBackupsList(): Promise<
    Array<{ filename: string; size: number; createdAt: string; milestone?: number }>
  > {
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const files = await fs.readdir(BACKUP_DIR);
      const list = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const fullPath = path.join(BACKUP_DIR, file);
        const stat = await fs.stat(fullPath);
        const match = file.match(/prereviews_checkpoint_(\d+)_/);
        list.push({
          filename: file,
          size: stat.size,
          createdAt: stat.birthtime.toISOString() || stat.mtime.toISOString(),
          milestone: match ? parseInt(match[1], 10) : undefined,
        });
      }
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error("[StorageManager] Error reading backups list:", err);
      return [];
    }
  }

  getAllVerdictsCount(): number {
    return this.verdicts.size;
  }

  async completePreApproval(projectId: string): Promise<CockpitProject | null> {
    const project = this.projects.get(projectId);
    if (project) {
      project.cockpitStatus = "completed_pre_approved";
      project.updatedAt = new Date().toISOString();
      await this.saveProject(project);
      return project;
    }
    return null;
  }

  getVerdict(projectId: string): VerdictDetails | undefined {
    return this.verdicts.get(projectId);
  }

  getAllVerdicts(): Record<string, VerdictDetails> {
    return Object.fromEntries(this.verdicts.entries());
  }

  // ---- STATS ----

  getStats(): QueueStats {
    const projects = this.getAllProjects();
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
        case "pending":
          pending++;
          break;
        case "in_review":
          inReview++;
          break;
        case "pre_approved":
          preApproved++;
          if (p.cockpitVerdict?.approvedHours) {
            totalApprovedHours += p.cockpitVerdict.approvedHours;
          } else if (p.submittedHours) {
            totalApprovedHours += p.submittedHours;
          }
          break;
        case "completed_pre_approved":
          completedPreApproved++;
          if (p.cockpitVerdict?.approvedHours) {
            totalApprovedHours += p.cockpitVerdict.approvedHours;
          }
          break;
        case "approved":
          approved++;
          break;
        case "rejected":
          rejected++;
          break;
        case "flagged_fraud":
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
}

export const storage = new StorageManager();
