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
 * Formats a standardized GitBook-compliant justification string for admin clipboard
 */
function formatClipboardJustification(project: CockpitProject, verdict: VerdictDetails): string {
  const lines: string[] = [];

  const verdictUpper = verdict.action === "pre_approve" ? "PRE-APPROVED" : "REJECTED";
  lines.push(`[COCKPIT ${verdictUpper}] Recommended Hours: ${verdict.approvedHours}h`);
  if (verdict.deflatedHours > 0) {
    lines.push(`(Deflated by ${verdict.deflatedHours}h from requested ${project.submittedHours}h)`);
  }
  lines.push("");

  if (project.hackatimeId) {
    lines.push(`• Submitter Hackatime ID: ${project.hackatimeId}`);
  }
  if (project.hackatimeProjects) {
    lines.push(`• Tracked Project(s): ${project.hackatimeProjects}`);
  }
  lines.push(`• Code URL: ${project.codeUrl}`);
  lines.push(`• Playable / Demo URL: ${project.playableUrl}`);
  lines.push("");

  lines.push("Justification & Technical Verification:");
  lines.push(verdict.hoursJustification || "Verified project delivers working code and matches tracked velocity.");

  if (verdict.publicFeedback) {
    lines.push("");
    lines.push("Feedback to Submitter:");
    lines.push(verdict.publicFeedback);
  }

  lines.push("");
  lines.push(`Reviewed by Cockpit Reviewer: ${verdict.reviewerName} at ${new Date(verdict.decidedAt).toLocaleString()}`);

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
      reviewerName: payload.reviewerName || "Reviewer",
      decidedAt: new Date().toISOString(),
    };

    await storage.saveVerdict(project.id, verdict);
    await logVerdictRecorded(project, verdict, verdict.reviewerName);

    res.json({
      ok: true,
      verdict,
      project: storage.getProject(project.id),
      stats: storage.getStats(),
    });
  } catch (err: any) {
    console.error("Error in /api/verdicts:", err);
    res.status(500).json({ error: err.message || "Failed to save verdict" });
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
// 7. STATS & AUDIT LOG
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

