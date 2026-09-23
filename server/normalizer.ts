import { CockpitProject, CockpitStatus, ProjectType, RawLiveSubmissionDump } from "./types.js";

function decodeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

function extractAllUrls(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return Array.from(
      new Set(
        val
          .flatMap((item) => extractAllUrls(item))
          .filter(Boolean)
      )
    );
  }
  if (typeof val === "string") {
    const matches = val.match(/(https?:\/\/[^\s,;<>()[\]]+|www\.[^\s,;<>()[\]]+)/gi) || [];
    const cleaned = matches.map((u) => {
      let clean = u.replace(/[.,;:)\]]+$/, "");
      if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
        clean = "https://" + clean;
      }
      return clean;
    });
    return Array.from(new Set(cleaned));
  }
  return [];
}

/**
 * Derives a human-friendly project name from codeUrl or description
 */
function deriveProjectName(raw: any, codeUrl: string, description: string): string {
  if (raw.projectName && typeof raw.projectName === "string" && raw.projectName.trim()) {
    return decodeHtml(raw.projectName.trim());
  }
  if (raw["Project Name"] && typeof raw["Project Name"] === "string" && raw["Project Name"].trim()) {
    return decodeHtml(raw["Project Name"].trim());
  }

  // Try extracting repo name from GitHub URL
  if (codeUrl) {
    try {
      const match = codeUrl.match(/github\.com\/[^/]+\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeHtml(match[1].replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
      }
    } catch {
      // ignore
    }
  }

  // Try first line of description
  if (description) {
    const firstLine = decodeHtml(description.split("\n")[0].trim());
    if (firstLine.length > 0 && firstLine.length <= 40) {
      return firstLine;
    }
  }

  const idSuffix = String(raw.id || "unknown").slice(-6);
  return `Project ${idSuffix}`;
}

/**
 * Extracts screenshot URL from string or Airtable attachment array
 */
function extractScreenshotUrl(screenshot: any): string | undefined {
  if (!screenshot) return undefined;
  if (typeof screenshot === "string") return screenshot;
  if (Array.isArray(screenshot) && screenshot.length > 0) {
    return screenshot[0]?.url || screenshot[0]?.thumbnails?.large?.url;
  }
  return undefined;
}

/**
 * Normalizes lapse links to string array
 */
function normalizeLapseLinks(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  if (typeof val === "string") {
    return extractAllUrls(val);
  }
  return [];
}

/**
 * Normalizes any incoming Live submission shape into a canonical CockpitProject
 */
export function normalizeLiveSubmission(
  raw: RawLiveSubmissionDump,
  existing?: CockpitProject
): CockpitProject {
  const fields = raw.fields || {};

  // Resolve values across fields dictionary or flattened properties
  const id = String(raw.id || fields.id || "").trim();
  const rawCodeVal = raw.codeUrl || fields["Code URL"] || fields.codeUrl || "";
  const rawPlayableVal = raw.playableUrl || fields["Playable URL"] || fields.playableUrl || "";

  const allCodeUrls = extractAllUrls(rawCodeVal);
  const allPlayableUrls = extractAllUrls(rawPlayableVal);

  const codeUrl = allCodeUrls[0] || String(rawCodeVal).trim();
  const playableUrl = allPlayableUrls[0] || String(rawPlayableVal).trim();

  const archiveUrl = String(
    raw.archiveUrl ||
      fields["Archive URL"] ||
      fields["Archive Link"] ||
      fields["Archive"] ||
      fields["Archive commit"] ||
      ""
  ).trim() || undefined;

  const rawDescription = String(
    raw.description || fields["Description"] || fields.description || ""
  ).trim();
  const description = decodeHtml(rawDescription);

  const githubUsername = String(
    raw.githubUsername || fields["GitHub Username"] || fields.githubUsername || ""
  ).trim();
  const screenshotUrl = extractScreenshotUrl(
    raw.screenshotUrl ?? raw.screenshot ?? fields["Screenshot"] ?? fields.screenshot
  );

  const overrideHours = Number(
    raw.overrideHours ?? fields["Optional - Override Hours Spent"] ?? fields.overrideHours ?? 0
  );
  const submittedHours = Number.isFinite(overrideHours) && overrideHours >= 0 ? overrideHours : 0;
  
  const overrideHoursJustification = decodeHtml(String(
    raw.overrideHoursJustification ||
      fields["Optional - Override Hours Spent Justification"] ||
      fields.overrideHoursJustification ||
      ""
  ).trim()) || undefined;

  const hackatimeId = String(
    raw.hackatimeId || fields["Justification - Submitter Hackatime ID"] || fields.hackatimeId || ""
  ).trim() || undefined;

  const hackatimeProjects = decodeHtml(String(
    raw.hackatimeProjects ||
      fields["Justification - Hackatime Project Name(s) + Date Range(s)"] ||
      fields.hackatimeProjects ||
      ""
  ).trim()) || undefined;

  const lapseLinks = normalizeLapseLinks(
    raw.lapseLinks ?? fields["Justification - Lapse Links, comma-separated"] ?? fields.lapseLinks
  );

  const liveApproved = Boolean(
    raw.approved ?? fields["Approved"] ?? fields.approved ?? false
  );
  const liveReviewStatus = String(
    raw.reviewStatus || fields["Review Status"] || fields.reviewStatus || "Pending"
  );
  const liveReviewedAt = String(
    raw.reviewedAt || fields["Reviewed At"] || fields.reviewedAt || ""
  ).trim() || undefined;
  const liveReviewedBy = String(
    raw.reviewedBy || fields["Reviewed By"] || fields.reviewedBy || ""
  ).trim() || undefined;

  const liveReviewerVerdict = String(
    raw.reviewerVerdict || fields["Reviewer Verdict"] || fields.reviewerVerdict || ""
  ).trim() || undefined;
  const liveReviewerJustification = String(
    raw.reviewerJustification ||
      fields["Reviewer Justification"] ||
      fields.reviewerJustification ||
      ""
  ).trim() || undefined;
  const liveReviewerHoursRaw = Number(
    raw.reviewerHours ?? fields["Reviewer Hours"] ?? fields.reviewerHours
  );
  const liveReviewerHours = Number.isFinite(liveReviewerHoursRaw)
    ? liveReviewerHoursRaw
    : undefined;
  const liveReviewerReviewedBy = String(
    raw.reviewerReviewedBy ||
      fields["Reviewer Reviewed By"] ||
      fields.reviewerReviewedBy ||
      ""
  ).trim() || undefined;
  const liveReviewerReviewedAt = String(
    raw.reviewerReviewedAt ||
      fields["Reviewer Reviewed At"] ||
      fields.reviewerReviewedAt ||
      ""
  ).trim() || undefined;

  const submittedAt = String(
    raw.submittedAt || raw.createdTime || fields["Created"] || new Date().toISOString()
  );

  const projectName = deriveProjectName(raw, codeUrl, description);
  const projectType: ProjectType =
    raw.projectType ||
    (fields["Project Type"]?.toLowerCase() === "hardware" ? "hardware" : "software");

  // Determine cockpitStatus
  let cockpitStatus: CockpitStatus = existing?.cockpitStatus || "pending";
  if (!existing) {
    if (liveApproved || liveReviewerVerdict === "Approve") {
      cockpitStatus = "pre_approved";
    } else if (liveReviewStatus === "Rejected" || liveReviewerVerdict === "Reject") {
      cockpitStatus = "rejected";
    } else if (liveReviewStatus === "Fraud") {
      cockpitStatus = "flagged_fraud";
    }
  }

  const now = new Date().toISOString();

  return {
    id: existing?.id || id,
    liveRecordId: id,
    projectName,
    projectType,
    codeUrl,
    allCodeUrls: allCodeUrls.length > 0 ? allCodeUrls : [codeUrl].filter(Boolean),
    playableUrl,
    allPlayableUrls: allPlayableUrls.length > 0 ? allPlayableUrls : [playableUrl].filter(Boolean),
    archiveUrl,
    description,
    githubUsername,
    screenshotUrl: screenshotUrl || existing?.screenshotUrl,
    submittedHours,
    overrideHoursJustification,
    hackatimeId,
    hackatimeProjects,
    lapseLinks,
    liveApproved,
    liveReviewStatus,
    liveReviewedAt,
    liveReviewedBy,
    liveReviewerVerdict,
    liveReviewerJustification,
    liveReviewerHours,
    liveReviewerReviewedBy,
    liveReviewerReviewedAt,
    cockpitStatus,
    cockpitVerdict: existing?.cockpitVerdict,
    submittedAt: existing?.submittedAt || submittedAt,
    firstSyncedAt: existing?.firstSyncedAt || now,
    lastSyncedAt: now,
    updatedAt: now,
    version: existing ? existing.version : 1,
    changeCount: existing ? existing.changeCount : 0,
    telemetryCache: existing?.telemetryCache,
  };
}
