/**
 * Utility functions ported directly from Horizons Admin Reviewer (utils.ts)
 */

/** Format a date string as a relative time (e.g. "2d ago", "1mo ago") */
export function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/** Format the elapsed time between two date strings (e.g. "3h", "2d", "<1m"). Order-independent. */
export function timeBetween(a: string, b: string): string {
  if (!a || !b) return '';
  const seconds = Math.floor(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 1000);
  if (seconds < 60) return '<1m';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.floor(months / 12);
  return `${years}y`;
}

/** Format a date string as a full readable date */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Decode common HTML entities like &#39;, &quot;, &amp;, etc. */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
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

/**
 * Formats a clean commit breakdown string for copy-pasting.
 * Rules:
 * 1. If cosmetic & boilerplate and other types are under 10% and code commit is 90%+, do NOT mention them.
 * 2. If a non-code category (cosmetic, boilerplate) has 0, 1, or 2 commits, do NOT mention it.
 */
export function formatCommitsSummary(
  codeCount: number,
  cosmeticCount: number = 0,
  boilerplateCount: number = 0
): string {
  const total = codeCount + cosmeticCount + boilerplateCount;
  if (total === 0) {
    return '0 code related commits';
  }

  const codeRatio = codeCount / total;
  const isHighCodeConcentration = codeRatio >= 0.9;
  const nonCodeCount = cosmeticCount + boilerplateCount;

  // If combined non-code commits are under 10% and code commits is >= 90%, only mention code commits
  if (isHighCodeConcentration && nonCodeCount / total < 0.1) {
    return `${codeCount} code related commit${codeCount === 1 ? '' : 's'}`;
  }

  const parts = [`${codeCount} code related commit${codeCount === 1 ? '' : 's'}`];

  // Do not mention cosmetic commits if count <= 2 (0, 1, or 2), or if under 10% with 90%+ code
  const cosmeticRatio = cosmeticCount / total;
  const shouldOmitCosmetic =
    cosmeticCount <= 2 || (isHighCodeConcentration && cosmeticRatio < 0.1);

  if (!shouldOmitCosmetic && cosmeticCount > 0) {
    parts.push(`${cosmeticCount} cosmetic commit${cosmeticCount === 1 ? '' : 's'}`);
  }

  // Do not mention boilerplate commits if count <= 2 (0, 1, or 2), or if under 10% with 90%+ code
  const boilerplateRatio = boilerplateCount / total;
  const shouldOmitBoilerplate =
    boilerplateCount <= 2 || (isHighCodeConcentration && boilerplateRatio < 0.1);

  if (!shouldOmitBoilerplate && boilerplateCount > 0) {
    parts.push(`${boilerplateCount} boilerplate commit${boilerplateCount === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}

/**
 * Analyzes and classifies a repository's commits into code-related, cosmetic, and boilerplate commits.
 */
export function summarizeCommits(
  commits?: Array<{
    files?: Array<{ filename: string; additions?: number; deletions?: number }>;
    message?: string;
    additions?: number;
    deletions?: number;
  }>
): {
  codeCount: number;
  cosmeticCount: number;
  boilerplateCount: number;
  summaryText: string;
} {
  if (!commits || commits.length === 0) {
    return {
      codeCount: 0,
      cosmeticCount: 0,
      boilerplateCount: 0,
      summaryText: '0 code related commits',
    };
  }

  const codeExts = [
    '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.c', '.cpp', '.h',
    '.html', '.css', '.scss', '.sql', '.sh', '.kicad_pcb', '.kicad_sch',
    '.sch', '.brd', '.step', '.cad', '.java', '.kt', '.swift', '.php',
    '.rb', '.lua', '.dart', '.vue', '.svelte',
  ];

  const lockAndAssetExts = [
    '.lock', '-lock.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.webp', '.mp3', '.mp4', '.wav', '.pdf', '.woff', '.woff2', '.ttf',
  ];

  let codeCount = 0;
  let cosmeticCount = 0;
  let boilerplateCount = 0;

  for (const c of commits) {
    const files = c.files || [];
    if (files.length > 0) {
      let commitCodeAdditions = 0;
      files.forEach((f) => {
        const lower = f.filename.toLowerCase();
        const isCode = codeExts.some((ext) => lower.endsWith(ext));
        const isLockOrAsset = lockAndAssetExts.some((ext) => lower.includes(ext));
        if (isCode && !isLockOrAsset) {
          commitCodeAdditions += f.additions || 0;
        }
      });

      const onlyDocOrAssetFiles = files.every((f) => {
        const lower = f.filename.toLowerCase();
        return (
          lower.endsWith('.md') ||
          lower.endsWith('.txt') ||
          lower.includes('license') ||
          lockAndAssetExts.some((ext) => lower.includes(ext)) ||
          lower === '.gitignore'
        );
      });

      const additions = c.additions || 0;
      if (onlyDocOrAssetFiles) {
        cosmeticCount++;
      } else if (additions >= 1000 && commitCodeAdditions < 200) {
        boilerplateCount++;
      } else {
        codeCount++;
      }
    } else {
      // Fallback: analyze commit message
      const msg = (c.message || '').toLowerCase();
      const isCosmeticMsg =
        msg.startsWith('docs') ||
        msg.startsWith('chore') ||
        msg.startsWith('style') ||
        msg.includes('readme') ||
        msg.includes('.gitignore') ||
        msg.includes('license') ||
        msg.includes('asset') ||
        msg.includes('typo') ||
        msg.includes('cleanup');
      if (isCosmeticMsg) {
        cosmeticCount++;
      } else {
        codeCount++;
      }
    }
  }

  return {
    codeCount,
    cosmeticCount,
    boilerplateCount,
    summaryText: formatCommitsSummary(codeCount, cosmeticCount, boilerplateCount),
  };
}

export interface ChecklistAuditSummary {
  passed: number;
  failed: number;
  total: number;
  percent: number;
  items: Array<{
    id: string;
    label: string;
    status: 'passed' | 'failed' | 'unreviewed';
  }>;
}

export function computeChecklistAuditSummary(checklist: Record<string, any> = {}): ChecklistAuditSummary {
  const criteria: Array<{
    id: string;
    label: string;
    status: 'passed' | 'failed' | 'unreviewed';
  }> = [
    // 1. Stage 1: Cross-Program Double-Dipping & Prior Ships
    {
      id: 'stage1_double_dip_checked',
      label: 'Cross-Program Double-Dipping & Prior Ships',
      status: (() => {
        if (checklist['stage1_double_dip_checked'] === false || checklist['flag_potential_double_dip'] === true) return 'failed';
        if (checklist['stage1_double_dip_checked'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 2. Stage 1: Live Submissions History Audited
    {
      id: 'stage1_live_reviewed',
      label: 'Live Submissions History Audited',
      status: (() => {
        if (checklist['stage1_live_reviewed'] === false) return 'failed';
        if (checklist['stage1_live_reviewed'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 3. Stage 2: Project Title
    {
      id: 'shipped_name_valid',
      label: 'Project Title',
      status: (() => {
        if (checklist['shipped_name_valid'] === false) return 'failed';
        if (checklist['shipped_name_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 4. Stage 2: Public Source Code Repository
    {
      id: 'shipped_code_valid',
      label: 'Public Source Code Repository',
      status: (() => {
        if (checklist['shipped_code_valid'] === false) return 'failed';
        if (checklist['shipped_code_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 5. Stage 2: Project Description
    {
      id: 'shipped_desc_valid',
      label: 'Project Description',
      status: (() => {
        if (checklist['shipped_desc_valid'] === false) return 'failed';
        if (checklist['shipped_desc_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 6. Stage 2: Deliverable Screenshot
    {
      id: 'shipped_screenshot_valid',
      label: 'Deliverable Screenshot',
      status: (() => {
        if (checklist['shipped_screenshot_valid'] === false) return 'failed';
        if (checklist['shipped_screenshot_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 7. Stage 2: README Documentation Quality
    {
      id: 'shipped_readme',
      label: 'README Documentation Quality',
      status: (() => {
        const s = checklist['shipped_readme_status'];
        if (s === 'fail' || (checklist['shipped_readme_valid'] === false && s !== 'low_quality' && s !== 'ai_generated')) return 'failed';
        if (s === 'pass' || s === 'ai_generated' || s === 'low_quality' || checklist['shipped_readme_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 8. Stage 3: Playable Demo & Hosting Compliance
    {
      id: 'shipped_playable',
      label: 'Playable Demo & Hosting Compliance',
      status: (() => {
        const s = checklist['shipped_playable_status'];
        if (
          s === 'disallowed_host' ||
          s === 'broken' ||
          s === 'fail' ||
          checklist['shipped_playable_valid'] === false ||
          checklist['shipped_host_compliant'] === false
        ) return 'failed';
        if (s === 'pass' || s === 'needs_video' || checklist['shipped_playable_valid'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 9. Stage 4: Hackatime Telemetry Coding Heartbeats
    {
      id: 'telemetry_heartbeats',
      label: 'Hackatime Telemetry Coding Heartbeats',
      status: (() => {
        const s = checklist['telemetry_heartbeats_status'];
        if (
          s === 'missing' ||
          s === 'suspicious' ||
          checklist['telemetry_heartbeats_verified'] === false ||
          checklist['hackatime_sanity'] === false
        ) return 'failed';
        if (s === 'pass' || checklist['telemetry_heartbeats_verified'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 10. Stage 5: Archive vs Code Progression Verified
    {
      id: 'archive_progression_verified',
      label: 'Archive vs Code Progression Verified',
      status: (() => {
        if (checklist['archive_progression_verified'] === false || checklist['zero_progress_blocked'] === true) return 'failed';
        if (checklist['archive_progression_verified'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 11. Stage 5: Git Commits Progression & Authenticity
    {
      id: 'git_progression',
      label: 'Git Commits Progression & Authenticity',
      status: (() => {
        const s = checklist['git_progression_status'];
        if (
          s === 'ai_dump' ||
          s === 'ai_code' ||
          s === 'code_dump' ||
          s === 'fail' ||
          checklist['commits_diffs'] === false ||
          checklist['git_progression_verified'] === false ||
          checklist['flag_monolithic_dump'] === true ||
          checklist['flag_deleted_origin_files'] === true
        ) return 'failed';
        if (
          s === 'pass' ||
          s === 'deflate' ||
          checklist['commits_diffs'] === true ||
          checklist['git_progression_verified'] === true
        ) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 12. Stage 5: Google Plagiarism Clearance Check
    {
      id: 'plagiarism_google_cleared',
      label: 'Google Plagiarism Clearance Check',
      status: (() => {
        if (checklist['plagiarism_google_cleared'] === false) return 'failed';
        if (checklist['plagiarism_google_cleared'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 13. Stage 5: YouTube Plagiarism Clearance Check
    {
      id: 'plagiarism_youtube_cleared',
      label: 'YouTube Plagiarism Clearance Check',
      status: (() => {
        if (checklist['plagiarism_youtube_cleared'] === false) return 'failed';
        if (checklist['plagiarism_youtube_cleared'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 14. Stage 5: GitHub Plagiarism Clearance Check
    {
      id: 'plagiarism_github_cleared',
      label: 'GitHub Plagiarism Clearance Check',
      status: (() => {
        if (checklist['plagiarism_github_cleared'] === false) return 'failed';
        if (checklist['plagiarism_github_cleared'] === true) return 'passed';
        return 'unreviewed';
      })(),
    },
    // 15. Stage 6: Submitter Technical Experience Level Calibration
    {
      id: 'submitter_experience_level',
      label: 'Submitter Technical Experience Level Calibration',
      status: (() => {
        const exp = checklist['submitter_experience_level'];
        if (!exp || exp === 'uncalibrated') return 'unreviewed';
        return 'passed';
      })(),
    },
  ];

  let passed = criteria.filter((c) => c.status === 'passed').length;
  let failed = criteria.filter((c) => c.status === 'failed').length;

  if (
    (checklist['flag_tutorial_plagiarized'] === true || Boolean(checklist['note_plagiarism_match'])) &&
    !criteria.some((c) => c.id.startsWith('plagiarism_') && c.status === 'failed')
  ) {
    failed += 1;
  }

  const total = Math.max(15, passed + failed);
  const percent = Math.min(100, Math.round(((passed + failed) / total) * 100));

  return {
    passed,
    failed,
    total,
    percent,
    items: criteria,
  };
}
