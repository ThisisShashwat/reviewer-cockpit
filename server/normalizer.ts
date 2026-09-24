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
  const fields = raw.fields || {};
  const explicitName =
    raw.projectName ||
    raw.project_name ||
    raw.projectname ||
    raw["Project Name"] ||
    fields.projectName ||
    fields.project_name ||
    fields.projectname ||
    fields["Project Name"];

  if (explicitName && typeof explicitName === "string" && explicitName.trim()) {
    return decodeHtml(explicitName.trim());
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
  const rawCodeVal =
    raw.codeUrl ||
    (raw as any).code_url ||
    (raw as any).codeurl ||
    (raw as any)["Code URL"] ||
    fields["Code URL"] ||
    fields.codeUrl ||
    (fields as any).code_url ||
    (fields as any).codeurl ||
    "";
  const rawPlayableVal =
    raw.playableUrl ||
    (raw as any).playable_url ||
    (raw as any).playableurl ||
    (raw as any)["Playable URL"] ||
    fields["Playable URL"] ||
    fields.playableUrl ||
    (fields as any).playable_url ||
    (fields as any).playableurl ||
    "";

  const allCodeUrls = extractAllUrls(rawCodeVal);
  const allPlayableUrls = extractAllUrls(rawPlayableVal);

  const codeUrl = allCodeUrls[0] || String(rawCodeVal).trim();
  const playableUrl = allPlayableUrls[0] || String(rawPlayableVal).trim();

  const archiveUrl = String(
    raw.archiveUrl ||
      (raw as any).archive_url ||
      fields["Archive URL"] ||
      fields["Archive Link"] ||
      fields["Archive"] ||
      fields["Archive commit"] ||
      ""
  ).trim() || undefined;

  const rawDescription = String(
    raw.description ||
      (raw as any).desc ||
      fields["Description"] ||
      fields.description ||
      (fields as any).desc ||
      ""
  ).trim();
  const description = decodeHtml(rawDescription);

  const githubUsername = String(
    raw.githubUsername ||
      (raw as any).github_username ||
      (raw as any).githubusername ||
      (raw as any).githubusrname ||
      (raw as any).github ||
      fields["GitHub Username"] ||
      fields.githubUsername ||
      (fields as any).github_username ||
      (fields as any).githubusername ||
      (fields as any).githubusrname ||
      ""
  ).trim();
  const screenshotUrl = extractScreenshotUrl(
    raw.screenshotUrl ??
      (raw as any).screenshot_url ??
      raw.screenshot ??
      (raw as any).image ??
      fields["Screenshot"] ??
      fields.screenshot ??
      (fields as any).screenshotUrl ??
      (fields as any).screenshot_url
  );

  const hoursCandidate =
    (raw as any).submittedHours ??
    (raw as any).submitted_hours ??
    (raw as any).submittedhours ??
    raw.overrideHours ??
    (raw as any).override_hours ??
    (raw as any).hours ??
    fields["Optional - Override Hours Spent"] ??
    fields.overrideHours ??
    (fields as any).submittedHours ??
    (fields as any).submitted_hours ??
    (fields as any).hours ??
    0;
  const parsedHours = Number(hoursCandidate);
  const submittedHours = Number.isFinite(parsedHours) && parsedHours >= 0 ? parsedHours : 0;
  
  const overrideHoursJustification = decodeHtml(String(
    raw.overrideHoursJustification ||
      (raw as any).override_hours_justification ||
      (raw as any).hoursJustification ||
      fields["Optional - Override Hours Spent Justification"] ||
      fields.overrideHoursJustification ||
      ""
  ).trim()) || undefined;

  const hackatimeId = String(
    raw.hackatimeId ||
      (raw as any).hackatime_id ||
      (raw as any).hackatimeid ||
      fields["Justification - Submitter Hackatime ID"] ||
      fields.hackatimeId ||
      (fields as any).hackatime_id ||
      (fields as any).hackatimeid ||
      ""
  ).trim() || undefined;

  const hackatimeProjects = decodeHtml(String(
    raw.hackatimeProjects ||
      (raw as any).hackatime_projects ||
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
  const rawType =
    raw.projectType ||
    (raw as any).project_type ||
    (raw as any).type ||
    fields["Project Type"] ||
    fields.projectType ||
    (fields as any).project_type ||
    (fields as any).type ||
    "software";
  const projectType: ProjectType =
    String(rawType).toLowerCase().trim() === "hardware" ? "hardware" : "software";

  // Determine cockpitStatus
  let cockpitStatus: CockpitStatus = existing?.cockpitStatus || "pending";
  if (!existing) {
    const rawQueue = String((raw as any).queue || (raw as any).status || "").toLowerCase().trim();
    if (rawQueue === "approved" || liveApproved || liveReviewerVerdict === "Approve") {
      cockpitStatus = "approved";
    } else if (rawQueue === "rejected" || liveReviewStatus === "Rejected" || liveReviewerVerdict === "Reject") {
      cockpitStatus = "rejected";
    } else if (rawQueue === "fraud" || liveReviewStatus === "Fraud") {
      cockpitStatus = "flagged_fraud";
    } else if (rawQueue === "pre_approved") {
      cockpitStatus = "pre_approved";
    } else if (rawQueue === "completed_pre_approved") {
      cockpitStatus = "completed_pre_approved";
    } else {
      cockpitStatus = "pending";
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
