import { Router } from "express";
import { logNoteAdded, logProjectCreated, logProjectUpdated, logVerdictRecorded } from "./audit.js";
import { computeProjectDiffs } from "./change-detector.js";
import { normalizeLiveSubmission } from "./normalizer.js";
import { storage } from "./storage.js";
import {
  CockpitProject,
  PreapprovedExportItem,
  RawLiveSubmissionDump,
  SubmitVerdictRequest,
  VerdictDetails,
} from "./types.js";

export const apiRouter = Router();

/**
 * Formats a clean commit breakdown string for copy-pasting.
 * Rules:
 * 1. If cosmetic & boilerplate and other types are under 10% and code commit is 90%+, do NOT mention them.
 * 2. If a non-code category (cosmetic, boilerplate) has 0, 1, or 2 commits, do NOT mention it.
 */
function formatCommitsSummary(
  codeCount: number,
  cosmeticCount: number = 0,
  boilerplateCount: number = 0
): string {
  const total = codeCount + cosmeticCount + boilerplateCount;
  if (total === 0) {
    return "0 code related commits";
  }

  const codeRatio = codeCount / total;
  const isHighCodeConcentration = codeRatio >= 0.9;
  const nonCodeCount = cosmeticCount + boilerplateCount;

  if (isHighCodeConcentration && nonCodeCount / total < 0.1) {
    return `${codeCount} code related commit${codeCount === 1 ? "" : "s"}`;
  }

  const parts = [`${codeCount} code related commit${codeCount === 1 ? "" : "s"}`];

  const cosmeticRatio = cosmeticCount / total;
  const shouldOmitCosmetic =
    cosmeticCount <= 2 || (isHighCodeConcentration && cosmeticRatio < 0.1);

  if (!shouldOmitCosmetic && cosmeticCount > 0) {
    parts.push(`${cosmeticCount} cosmetic commit${cosmeticCount === 1 ? "" : "s"}`);
  }

  const boilerplateRatio = boilerplateCount / total;
  const shouldOmitBoilerplate =
    boilerplateCount <= 2 || (isHighCodeConcentration && boilerplateRatio < 0.1);

  if (!shouldOmitBoilerplate && boilerplateCount > 0) {
    parts.push(`${boilerplateCount} boilerplate commit${boilerplateCount === 1 ? "" : "s"}`);
  }

  return parts.join(", ");
}

/**
 * Formats a standardized GitBook-compliant justification string for admin clipboard
 */
function formatClipboardJustification(project: CockpitProject, verdict: VerdictDetails): string {
  const lines: string[] = [];

  lines.push(`Project: ${project.projectName || "Unnamed"}`);
  lines.push(`Hackatime ID: ${project.hackatimeId || project.id || "N/A"}`);

  const applied = verdict.appliedChecklist || {};
  const expMap: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    highly_experienced: "Highly Experienced / Pro",
  };
  const currentExp = applied.submitter_experience_level;
  if (currentExp && currentExp.toLowerCase() !== "uncalibrated") {
    const expText = expMap[currentExp] || currentExp;
    lines.push(`Experience: ${expText}`);
  }

  // Shipped status
  const shippedFailures: string[] = [];
  if (applied.shipped_name_valid === false) shippedFailures.push("Missing project title");
  if (applied.shipped_code_valid === false) shippedFailures.push("Missing GitHub repository");
  if (applied.shipped_desc_valid === false) shippedFailures.push("Missing description");
  if (applied.shipped_screenshot_valid === false) shippedFailures.push("Missing deliverable screenshot");
  if (applied.shipped_readme_status === "fail" || applied.shipped_readme_valid === false) {
    shippedFailures.push("Missing README");
  } else if (applied.shipped_readme_status === "low_quality") {
    shippedFailures.push("Low quality README");
  } else if (applied.shipped_readme_status === "ai_generated") {
    shippedFailures.push("AI-generated README");
  }
  if (applied.shipped_playable_status === "disallowed_host" || applied.shipped_host_compliant === false) {
    shippedFailures.push("Disallowed host: Streamlit/Replit/Drive");
  } else if (applied.shipped_playable_status === "broken") {
    shippedFailures.push("Playable demo broken/crashing");
  } else if (applied.shipped_playable_status === "fail" || applied.shipped_playable_valid === false) {
    shippedFailures.push("Missing playable demo");
  } else if (applied.shipped_playable_status === "needs_video") {
    shippedFailures.push("Video proof required");
  }

  if (shippedFailures.length === 0) {
    lines.push("Shipped: Yes");
  } else {
    lines.push(`Shipped: No (${shippedFailures.join(", ")})`);
  }

  // Commits breakdown (directly after Shipped)
  let commitsSummary = applied.commits_summary;
  if (applied.code_commits_count !== undefined || applied.cosmetic_commits_count !== undefined) {
    commitsSummary = formatCommitsSummary(
      applied.code_commits_count || 0,
      applied.cosmetic_commits_count || 0,
      applied.boilerplate_commits_count || 0
    );
  } else if (!commitsSummary) {
    commitsSummary = "0 code related commits";
  } else {
    commitsSummary = commitsSummary
      .replace(/,\s*0 cosmetic commits?/gi, "")
      .replace(/,\s*1 cosmetic commits?/gi, "")
      .replace(/,\s*2 cosmetic commits?/gi, "")
      .replace(/,\s*0 boilerplate commits?/gi, "")
      .replace(/,\s*1 boilerplate commits?/gi, "")
      .replace(/,\s*2 boilerplate commits?/gi, "");
  }
  lines.push(`Commits: ${commitsSummary}`);

  // Verdict: Accepted / Rejected & deflated hours
  const isDeflated = verdict.action === "pre_approve" && (verdict.approvedHours < project.submittedHours || (verdict.deflatedHours ?? 0) > 0);
  const verdictText = verdict.action === "pre_approve"
    ? (isDeflated ? `Accepted (deflated from ${project.submittedHours} hrs to ${verdict.approvedHours} hrs)` : "Accepted")
    : verdict.action === "flag_fraud"
    ? "Rejected (Fraud)"
    : "Rejected";
  lines.push(`Verdict: ${verdictText}`);

  // Failed checklists (strictly what failed; no passed, no skipped)
  const failedList: string[] = [];
  const isDoubleDipFailed =
    applied.stage1_double_dip_checked === false ||
    applied.stage1_halceon_reviewed === false ||
    applied.flag_potential_double_dip === true;

  if (isDoubleDipFailed) {
    const prog =
      applied.double_dipped_program ||
      (project.archiveUrl?.includes("high-seas") ? "High Seas" :
       project.archiveUrl?.includes("arcade") ? "Arcade" :
       project.archiveUrl?.includes("blot") ? "Blot" :
       project.archiveUrl?.includes("stardance") ? "Stardance" :
       project.archiveUrl?.includes("sprig") ? "Sprig" : undefined);

    if (prog) {
      failedList.push(`- Double dipped from ${prog}`);
    } else {
      failedList.push("- Double dipped from prior program");
    }
  }

  if (applied.stage1_live_reviewed === false && !isDoubleDipFailed) {
    failedList.push("- Submitter History: Unresolved conflict in past Hack Club Live submissions");
  }
  if (applied.shipped_name_valid === false) failedList.push("- Project Name: Missing or insufficient project title");
  if (applied.shipped_code_valid === false) failedList.push("- Source Code Repository: Missing or invalid GitHub repository");
  if (applied.shipped_desc_valid === false) failedList.push("- Project Description: Missing or insufficient description");
  if (applied.shipped_screenshot_valid === false) failedList.push("- Deliverable Screenshot: Missing deliverable screenshot");
  if (applied.shipped_readme_status === "fail" || applied.shipped_readme_valid === false) {
    failedList.push("- Repository README: Missing or broken repository documentation");
  } else if (applied.shipped_readme_status === "low_quality") {
    failedList.push("- Repository README: Low quality or sparse documentation");
  } else if (applied.shipped_readme_status === "ai_generated") {
    failedList.push("- Repository README: AI-generated boilerplate");
  }
  if (applied.shipped_playable_status === "disallowed_host" || applied.shipped_host_compliant === false) {
    failedList.push("- Playable Demo: Disallowed Ephemeral Host (Streamlit / Replit / Drive)");
  } else if (applied.shipped_playable_status === "broken") {
    failedList.push("- Playable Demo: Application is broken or crashing");
  } else if (applied.shipped_playable_status === "fail" || applied.shipped_playable_valid === false) {
    failedList.push("- Playable Demo: Missing or inaccessible deliverable");
  } else if (applied.shipped_playable_status === "needs_video") {
    failedList.push("- Playable Demo: Video proof required");
  }
  if (applied.telemetry_heartbeats_status === "missing" || applied.telemetry_heartbeats_verified === false) {
    failedList.push("- Hackatime Telemetry: Missing telemetry heartbeats");
  } else if (applied.telemetry_heartbeats_status === "suspicious" || applied.hackatime_sanity === false) {
    failedList.push("- Hackatime Telemetry: Suspicious coding heartbeats");
  }

  // Stage 5 Git Commits Progression & Forensics
  const isArchiveProgressionFailed =
    applied.archive_progression_verified === false ||
    applied.zero_progress_blocked === true;

  if (isArchiveProgressionFailed) {
    const archHash =
      applied.archive_short_hash ||
      applied.archive_commit_hash?.slice(0, 7) ||
      (project.archiveUrl && archiveCommitCache.get(project.archiveUrl.replace(/\/git\/?$/, ""))?.shortHash);
    const curHash =
      applied.current_short_hash ||
      applied.current_commit_hash?.slice(0, 7);

    if (archHash && curHash) {
      failedList.push(`- Archive vs Code Progression: Compared commit ${archHash} (from unified archive) with commit ${curHash} (current)`);
    } else if (archHash) {
      failedList.push(`- Archive vs Code Progression: Compared commit ${archHash} (from unified archive) with current code - no genuine additions beyond baseline`);
    } else {
      failedList.push(`- Archive vs Code Progression: Compared unified archive with current code - no genuine additions beyond baseline`);
    }
  }

  if (applied.flag_monolithic_dump || applied.git_progression_status === "ai_dump") {
    failedList.push("- Git Commit Progression: AI coding");
  } else if (applied.git_progression_status === "fail" || applied.commits_diffs === false || applied.git_progression_verified === false) {
    failedList.push("- Git Commit Progression: Zero progress or broken git history");
  } else if (applied.git_progression_status === "deflate") {
    failedList.push("- Git Commit Progression: Low incremental progress");
  }
  if (applied.flag_deleted_origin_files) {
    failedList.push("- Git Commit Progression: Deleted origin files");
  }
  if (applied.flag_tutorial_plagiarized || applied.note_plagiarism_match) {
    failedList.push("- Plagiarism / Tutorial Clone: Submission matches existing tutorial or external codebase");
  }

  if (failedList.length > 0) {
    lines.push("");
    lines.push(...failedList);
  }

  if (verdict.hoursJustification?.trim()) {
    lines.push("");
    lines.push(verdict.hoursJustification.trim());
  }

  return lines.join("\n");
}

// -------------------------------------------------------------
// 1. SYNC ENDPOINT: Ingest bulk dump from Live Admin
// -------------------------------------------------------------
apiRouter.post("/sync/projects", async (req, res) => {
  try {
    const rawItems: RawLiveSubmissionDump[] = Array.isArray(req.body)
      ? req.body
      : req.body.records || req.body.projects || [];

    if (!Array.isArray(rawItems)) {
      res.status(400).json({ error: "Expected an array of projects or { records: [...] }" });
      return;
    }

    console.log(`[POST /api/sync/projects] Ingesting ${rawItems.length} records...`);

    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const touchedProjects: CockpitProject[] = [];

    for (const raw of rawItems) {
      const recordId = String(raw.id || raw.fields?.id || "").trim();
      if (!recordId) continue;

      const existing = storage.getProject(recordId);

      if (!existing) {
        // Brand new project
        const project = normalizeLiveSubmission(raw);
        await storage.saveProject(project);
        await logProjectCreated(project, "live_sync_exporter");
        createdCount++;
        touchedProjects.push(project);
      } else {
        // Project exists -> detect diffs
        const incoming = normalizeLiveSubmission(raw, existing);
        const diffs = computeProjectDiffs(existing, incoming);

        if (diffs.length > 0) {
          incoming.version = existing.version + 1;
          incoming.changeCount = existing.changeCount + diffs.length;
          incoming.firstSyncedAt = existing.firstSyncedAt;

          // Preserve in-progress reviewer decision unless overridden
          if (existing.cockpitVerdict) {
            incoming.cockpitVerdict = existing.cockpitVerdict;
            incoming.cockpitStatus = existing.cockpitStatus;
          }

          await storage.saveProject(incoming);
          await logProjectUpdated(incoming, diffs, "live_sync_exporter");
          updatedCount++;
          touchedProjects.push(incoming);
        } else {
          // No monitored fields changed, just touch lastSyncedAt
          existing.lastSyncedAt = new Date().toISOString();
          await storage.saveProject(existing);
          unchangedCount++;
        }
      }
    }

    res.json({
      ok: true,
      processed: rawItems.length,
      created: createdCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error in /api/sync/projects:", err);
    res.status(500).json({ error: err.message || "Failed to sync projects" });
  }
});

// -------------------------------------------------------------
// 2. QUEUE LIST: Fetch all projects with filter & stats
// -------------------------------------------------------------
apiRouter.get("/projects", (req, res) => {
  const statusFilter = req.query.status as string | undefined;
  const typeFilter = req.query.type as string | undefined;
  const search = (req.query.search as string | undefined)?.toLowerCase().trim();

  let list = storage.getAllProjects();

  if (statusFilter && statusFilter !== "all") {
    list = list.filter((p) => p.cockpitStatus === statusFilter);
  }

  if (typeFilter && typeFilter !== "all") {
    list = list.filter((p) => p.projectType === typeFilter);
  }

  if (search) {
    list = list.filter(
      (p) =>
        p.projectName.toLowerCase().includes(search) ||
        p.githubUsername.toLowerCase().includes(search) ||
        p.codeUrl.toLowerCase().includes(search) ||
        p.description.toLowerCase().includes(search)
    );
  }

  // Sort by pending first, then newest
  list.sort((a, b) => {
    if (a.cockpitStatus === "pending" && b.cockpitStatus !== "pending") return -1;
    if (a.cockpitStatus !== "pending" && b.cockpitStatus === "pending") return 1;
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  res.json({
    projects: list,
    stats: storage.getStats(),
  });
});

// -------------------------------------------------------------
// 3. SINGLE PROJECT: Fetch details with full audit timeline
// -------------------------------------------------------------
apiRouter.get("/projects/:id", (req, res) => {
  const id = req.params.id;
  const project = storage.getProject(id);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const auditHistory = storage.getAuditLogs(project.id);
  const verdict = storage.getVerdict(project.id);

  res.json({
    project,
    auditHistory,
    verdict,
  });
});

// -------------------------------------------------------------
// 4. SUBMIT VERDICT: Pre-approve, reject, or flag fraud
// -------------------------------------------------------------
apiRouter.post("/verdicts", async (req, res) => {
  try {
    const payload = req.body as SubmitVerdictRequest;

    if (!payload.projectId || !payload.action) {
      res.status(400).json({ error: "projectId and action are required" });
      return;
    }

    const project = storage.getProject(payload.projectId);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const approvedHours = Number(payload.approvedHours ?? 0);
    const deflatedHours =
      payload.deflatedHours ?? Math.max(0, project.submittedHours - approvedHours);

    const verdict: VerdictDetails = {
      action: payload.action,
      approvedHours,
      deflatedHours,
      hoursJustification: String(payload.hoursJustification || "").trim(),
      publicFeedback: String(payload.publicFeedback || "").trim(),
      internalNotes: String(payload.internalNotes || "").trim(),
      appliedChecklist: payload.appliedChecklist || {},
      checklistNotes: payload.checklistNotes || {},
      reviewerName: payload.reviewerName || "Reviewer",
      decidedAt: new Date().toISOString(),
    };

    const saveResult = await storage.saveVerdict(project.id, verdict);
    await logVerdictRecorded(project, verdict, verdict.reviewerName);

    res.json({
      ok: true,
      verdict,
      project: storage.getProject(project.id),
      stats: storage.getStats(),
      backupInfo: saveResult.backupInfo,
    });
  } catch (err: any) {
    console.error("Error in /api/verdicts:", err);
    res.status(500).json({ error: err.message || "Failed to save verdict" });
  }
});

// -------------------------------------------------------------
// 4b. PERMANENT BACKUPS (Automated every 5 prereviews)
// -------------------------------------------------------------
apiRouter.get("/backups", async (_req, res) => {
  try {
    const list = await storage.getBackupsList();
    res.json({ ok: true, backups: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch backups" });
  }
});

apiRouter.post("/backups/create", async (_req, res) => {
  try {
    const prereviewCount = storage.getAllVerdictsCount();
    const backup = await storage.createPermanentBackup(prereviewCount);
    res.json({ ok: true, backup });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create manual backup" });
  }
});

// Complete Pre-Approval (Admin Action: Moves project to completed_pre_approved)
apiRouter.post("/projects/:id/complete-preapproval", async (req, res) => {
  try {
    const { id } = req.params;
    const project = await storage.completePreApproval(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    await logAudit(project.id, project.liveRecordId, "cockpit_admin", "Admin", "verdict_recorded", {
      action: "marked_completed_pre_approved",
    });
    res.json({
      ok: true,
      project,
      stats: storage.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to mark as completed" });
  }
});

// -------------------------------------------------------------
// 5. PRE-APPROVED QUEUE (Admin View + 1-Click Clipboard Export)
// -------------------------------------------------------------
apiRouter.get("/preapproved", (req, res) => {
  const projects = storage.getAllProjects().filter((p) => p.cockpitStatus === "pre_approved");

  const items: PreapprovedExportItem[] = projects.map((p) => {
    const verdict = p.cockpitVerdict || {
      action: "pre_approve" as const,
      approvedHours: p.submittedHours,
      deflatedHours: 0,
      hoursJustification: "Approved without adjustments",
      publicFeedback: "",
      internalNotes: "",
      appliedChecklist: {},
      reviewerName: "Auto",
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
      recommendedVerdict: "approve",
      justification: verdict.hoursJustification,
      decidedAt: verdict.decidedAt,
      reviewerName: verdict.reviewerName,
      clipboardText: formatClipboardJustification(p, verdict),
    };
  });

  res.json({
    items,
    count: items.length,
  });
});

// -------------------------------------------------------------
// 6. SCRATCHPAD NOTES: Append internal notes to project audit log
// -------------------------------------------------------------
apiRouter.post("/projects/:id/notes", async (req, res) => {
  try {
    const id = req.params.id;
    const note = String(req.body.note || "").trim();
    const actor = String(req.body.actor || "reviewer").trim();

    if (!note) {
      res.status(400).json({ error: "Note cannot be empty" });
      return;
    }

    const project = storage.getProject(id);
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const entry = await logNoteAdded(project, note, actor);
    res.json({ ok: true, entry });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 7. USER-LEVEL PERSISTENT NOTES (Shared across all projects by this user)
// -------------------------------------------------------------
const userNotesMap = new Map<string, Array<{ id: string; text: string; author: string; createdAt: string }>>();

apiRouter.get("/users/:username/notes", (req, res) => {
  const username = String(req.params.username || "").toLowerCase().trim();
  const notes = userNotesMap.get(username) || [];
  res.json({ username, notes });
});

apiRouter.post("/users/:username/notes", (req, res) => {
  try {
    const username = String(req.params.username || "").toLowerCase().trim();
    const text = String(req.body.text || "").trim();
    const author = String(req.body.author || "Reviewer").trim();

    if (!text) {
      res.status(400).json({ error: "Note text cannot be empty" });
      return;
    }

    const existing = userNotesMap.get(username) || [];
    const noteObj = {
      id: `unote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text,
      author,
      createdAt: new Date().toISOString(),
    };

    existing.unshift(noteObj);
    userNotesMap.set(username, existing);
    res.json({ ok: true, note: noteObj, notes: existing });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to save user note" });
  }
});

// -------------------------------------------------------------
// 8. STATS & AUDIT LOG
// -------------------------------------------------------------
apiRouter.get("/stats", (req, res) => {
  res.json(storage.getStats());
});

apiRouter.get("/audit", (req, res) => {
  const projectId = req.query.projectId as string | undefined;
  res.json(storage.getAuditLogs(projectId));
});

// -------------------------------------------------------------
// 8. HALCEON / BONKED USER SUBMISSIONS LOOKUP
// -------------------------------------------------------------
apiRouter.get("/halceon/:username", async (req, res) => {
  const username = String(req.params.username || "").trim();
  if (!username) {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  const url = `https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(username)}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!upstream.ok) {
      res.json({
        username,
        totalShips: 0,
        totalHours: 0,
        ships: [],
        halceonUrl: url,
      });
      return;
    }

    const html = await upstream.text();

    if (html.includes("No ships found for")) {
      res.json({
        username,
        totalShips: 0,
        totalHours: 0,
        ships: [],
        halceonUrl: url,
      });
      return;
    }

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

    const rowRegex = /<tr>\s*<td class="mono nowrap">(.*?)<\/td>\s*<td class="mono nowrap">(.*?)<\/td>\s*<td class="desc">(.*?)<\/td>\s*<td class="mono center">(\d+(?:\.\d+)?)<\/td>\s*<td class="mono center">.*?<\/td>\s*<td class="mono">.*?<\/td>\s*<td class="mono nowrap">(.*?)<\/td>\s*<td class="links nowrap">(.*?)<\/td>/gis;

    const ships: Array<{
      repo: string;
      program: string;
      description: string;
      hours: number;
      approvedAt: string;
      links: string[];
      parsedLinks: Array<{
        label: string;
        url: string;
        isArchive: boolean;
        type: 'repo' | 'demo' | 'archive_repo' | 'archive_demo' | 'image' | 'other';
      }>;
    }> = [];

    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rawRepo = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim());
      const program = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, "").trim());
      const rawDesc = match[3]
        .replace(/<summary>.*?<\/summary>/is, "")
        .replace(/<[^>]+>/g, "")
        .trim() || match[3].replace(/<[^>]+>/g, "").trim();
      const desc = decodeHtmlEntities(rawDesc);
      const hours = parseFloat(match[4]) || 0;
      const approvedAt = match[5].replace(/<[^>]+>/g, "").trim();
      const linksHtml = match[6];

      // Extract all links with labels and archive flags (can range from 1 to 4+)
      const parsedLinks: Array<{
        label: string;
        url: string;
        isArchive: boolean;
        type: 'repo' | 'demo' | 'archive_repo' | 'archive_demo' | 'image' | 'other';
      }> = [];

      const linkTagRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis;
      let lMatch;
      while ((lMatch = linkTagRegex.exec(linksHtml)) !== null) {
        const linkUrl = lMatch[1];
        const rawLabel = lMatch[2].replace(/<[^>]+>/g, "").trim();
        const isArchive =
          rawLabel.includes("*") ||
          linkUrl.includes("archive.hackclub.com") ||
          linkUrl.includes("archive.org");

        let type: 'repo' | 'demo' | 'archive_repo' | 'archive_demo' | 'image' | 'other' = 'other';
        if (rawLabel.startsWith("repo*") || (isArchive && (linkUrl.includes("github.com") || rawLabel.includes("repo")))) {
          type = 'archive_repo';
        } else if (rawLabel.startsWith("demo*") || (isArchive && rawLabel.includes("demo"))) {
          type = 'archive_demo';
        } else if (rawLabel.startsWith("repo") || linkUrl.includes("github.com")) {
          type = 'repo';
        } else if (rawLabel.startsWith("demo")) {
          type = 'demo';
        } else if (rawLabel.startsWith("img") || linkUrl.includes("airtableusercontent.com")) {
          type = 'image';
        } else if (isArchive) {
          type = 'archive_repo';
        }

        parsedLinks.push({
          label: rawLabel,
          url: linkUrl,
          isArchive,
          type,
        });
      }

      ships.push({
        repo: rawRepo,
        program,
        description: desc,
        hours,
        approvedAt,
        links: parsedLinks.map((p) => p.url),
        parsedLinks,
      });
    }

    const totalHours = Math.round(ships.reduce((sum, s) => sum + s.hours, 0) * 10) / 10;

    res.json({
      username,
      totalShips: ships.length,
      totalHours,
      ships,
      halceonUrl: url,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, halceonUrl: url });
  }
});

// Cache for archive commit lookups
const archiveCommitCache = new Map<string, { commitHash: string; shortHash: string; gitUrl: string; archiveId: string; checkedAt: string }>();

// -------------------------------------------------------------
// 10. ARCHIVE COMMIT HASH: Programmatically inspect prior archive HEAD commit
// -------------------------------------------------------------
apiRouter.get("/archive-commit", async (req, res) => {
  const rawUrl = String(req.query.url || "").trim();
  if (!rawUrl) {
    res.status(400).json({ error: "url query parameter is required" });
    return;
  }

  const cleanUrl = rawUrl.replace(/\/git\/?$/, "");
  const match = cleanUrl.match(/archive\.hackclub\.com\/(?:git\/)?([a-zA-Z0-9_-]+)/);
  if (!match) {
    res.status(400).json({ error: "Invalid Hack Club archive URL format" });
    return;
  }

  const archiveId = match[1];
  const gitUrl = `https://archive.hackclub.com/git/${archiveId}`;

  if (archiveCommitCache.has(gitUrl)) {
    res.json({ success: true, ...archiveCommitCache.get(gitUrl) });
    return;
  }

  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    const { stdout } = await execAsync(`git ls-remote ${gitUrl}`, { timeout: 8000 });
    const headMatch = stdout.match(/^([0-9a-f]{40})\s+HEAD/m) || stdout.match(/^([0-9a-f]{40})/m);

    if (!headMatch) {
      res.status(404).json({ error: "No git references found in archive repository" });
      return;
    }

    const commitHash = headMatch[1];
    const shortHash = commitHash.slice(0, 7);
    const result = {
      commitHash,
      shortHash,
      gitUrl,
      archiveId,
      checkedAt: new Date().toISOString(),
    };

    archiveCommitCache.set(gitUrl, result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to inspect remote archive git repository" });
  }
});

// Cache for frameable check results
const frameCheckCache = new Map<string, { canFrame: boolean; reason?: string; xfo?: string | null; csp?: string | null }>();

// -------------------------------------------------------------
// 11. PROXY CHECK-FRAME: Inspect X-Frame-Options & CSP headers
// -------------------------------------------------------------
apiRouter.get("/proxy/check-frame", async (req, res) => {
  const targetUrl = String(req.query.url || "").trim();
  if (!targetUrl || !targetUrl.startsWith("http")) {
    res.json({ canFrame: true });
    return;
  }

  if (frameCheckCache.has(targetUrl)) {
    res.json(frameCheckCache.get(targetUrl));
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    let response: Response | null = null;
    try {
      response = await fetch(targetUrl, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
    } catch {
      // If HEAD is rejected by server, try a lightweight GET
      response = await fetch(targetUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Range: "bytes=0-1024",
        },
      }).catch(() => null);
    }

    clearTimeout(timeout);

    if (!response) {
      const result = { canFrame: false, reason: "Host refused connection or timed out" };
      frameCheckCache.set(targetUrl, result);
      res.json(result);
      return;
    }

    const xfo = response.headers.get("x-frame-options");
    const csp = response.headers.get("content-security-policy");

    let canFrame = true;
    let reason: string | undefined = undefined;

    if (xfo) {
      const lowerXfo = xfo.toLowerCase().trim();
      if (lowerXfo.includes("deny") || lowerXfo.includes("sameorigin")) {
        canFrame = false;
        reason = `X-Frame-Options: ${xfo}`;
      }
    }

    if (canFrame && csp) {
      const lowerCsp = csp.toLowerCase();
      if (
        lowerCsp.includes("frame-ancestors 'none'") ||
        lowerCsp.includes("frame-ancestors 'self'") ||
        (lowerCsp.includes("frame-ancestors") && !lowerCsp.includes("frame-ancestors *"))
      ) {
        canFrame = false;
        reason = `Content-Security-Policy: frame-ancestors`;
      }
    }

    const result = { canFrame, reason, xfo, csp };
    frameCheckCache.set(targetUrl, result);
    res.json(result);
  } catch {
    res.json({ canFrame: false, reason: "Header check failed" });
  }
});

// -------------------------------------------------------------
// 10. AI-ENGINEERED SEARCH QUERY FOR PLAGIARISM FORENSICS
// Powered by Hack Club AI proxy with google/gemini-3.8-flash
// -------------------------------------------------------------
const HACKCLUB_AI_PROXY_URL = process.env.HACKCLUB_AI_PROXY_URL || "https://ai.hackclub.com/proxy/v1/chat/completions";
const HACKCLUB_AI_API_KEY = process.env.HACKCLUB_AI_API_KEY || "";


apiRouter.post("/ai/engineer-query", async (req, res) => {
  try {
    const { projectName, description, language, files, readmeSnippet } = req.body || {};

    if (!projectName) {
      return res.status(400).json({ error: "projectName is required" });
    }

    const fileList = Array.isArray(files) ? files.slice(0, 15).join(", ") : "";
    const prompt = `You are an expert open-source tutorial and plagiarism forensics investigator for student hackathons.
Analyze this submitted project:
- Name: "${projectName}"
- Description: "${description || "None provided"}"
- Language: "${language || "Unknown"}"
${fileList ? `- Key Files: "${fileList}"` : ""}
${readmeSnippet ? `- README excerpt: "${String(readmeSnippet).slice(0, 500)}"` : ""}

Engineer the single most effective, high-precision search query to uncover if this project is copied from an existing tutorial, YouTube walkthrough, or open-source repository clone.
DO NOT output generic filler. Formulate the exact keywords, project title, and framework identifiers that will find the original tutorial if it exists.
Return ONLY the exact search query text on a single line, with no quotes, formatting, or commentary.`;

    const aiRes = await fetch(HACKCLUB_AI_PROXY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HACKCLUB_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Hack Club AI proxy error:", errText);
      return res.status(502).json({ error: "AI proxy returned an error", details: errText });
    }

    const data: any = await aiRes.json();
    const rawQuery = data.choices?.[0]?.message?.content || "";
    // Clean up any extraneous quotes, backticks, or leading/trailing whitespace
    const cleanQuery = rawQuery.replace(/^[`"']+|[`"']+$/g, "").trim();

    res.json({
      query: cleanQuery || `${projectName} tutorial`,
      model: "google/gemini-3.8-flash",
    });
  } catch (err: any) {
    console.error("Failed to generate AI query:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI search query" });
  }
});



