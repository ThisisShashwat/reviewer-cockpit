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

/**
 * StorageManager provides durable, atomic file-backed JSON storage
 * with an in-memory cache for ultra-fast queries.
 */
export class StorageManager {
  private projects: Map<string, CockpitProject> = new Map();
  private auditLogs: AuditLogEntry[] = [];
  private verdicts: Map<string, VerdictDetails> = new Map();
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

    this.initialized = true;
    console.log(
      `[StorageManager] Initialized. Loaded ${this.projects.size} projects, ${this.auditLogs.length} audit logs, ${this.verdicts.size} verdicts.`
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

  async saveVerdict(projectId: string, verdict: VerdictDetails): Promise<void> {
    this.verdicts.set(projectId, verdict);
    const obj = Object.fromEntries(this.verdicts.entries());
    await this.atomicWriteFile(VERDICTS_FILE, obj);

    // Also update project's cockpitStatus and cockpitVerdict
    const project = this.projects.get(projectId);
    if (project) {
      project.cockpitVerdict = verdict;
      if (verdict.action === "pre_approve") {
        project.cockpitStatus = "pre_approved";
      } else if (verdict.action === "reject") {
        project.cockpitStatus = "rejected";
      } else if (verdict.action === "flag_fraud") {
        project.cockpitStatus = "flagged_fraud";
      }
      project.updatedAt = new Date().toISOString();
      await this.saveProject(project);
    }
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
      rejected,
      flaggedFraud,
      totalApprovedHours: Math.round(totalApprovedHours * 10) / 10,
      averageApprovedHours,
    };
  }
}

export const storage = new StorageManager();
