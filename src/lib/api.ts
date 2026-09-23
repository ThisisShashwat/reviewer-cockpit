/**
 * Client-Side Public API Fetchers
 * 
 * Interacts with public endpoints without needing any private API keys or .env credentials:
 * 1. GitHub REST API (Public Repositories, Full Commits with Diffs, File Tree, Releases, README)
 * 2. Hackatime Public User APIs (Stats, Languages, Project list)
 * 3. Hack Club Manifest API (Cross-YSWS Double-Dipping Lookup)
 */

import {
  AuditLogEntry,
  CockpitProject,
  GitHubRepoData,
  HackatimeProjectStats,
  ManifestLookupData,
  PreapprovedExportItem,
  QueueStats,
  SubmitVerdictRequest,
  VerdictDetails,
} from './types';

/**
 * Extracts owner and repo name from any GitHub URL
 */
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  if (!url) return null;
  try {
    const clean = url.trim().replace(/\.git$/, '');
    const match = clean.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Fetches public GitHub repository metadata, commits with diff stats, and file tree.
 * Gracefully handles rate limits and non-existent repositories.
 */
export async function fetchGitHubRepoData(codeUrl: string): Promise<Partial<GitHubRepoData>> {
  const parsed = parseGitHubRepo(codeUrl);
  if (!parsed) {
    return {
      isLoading: false,
      error: 'Invalid or non-GitHub repository URL'
    };
  }

  const { owner, repo } = parsed;

  try {
    // 1. Fetch Repository Info
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (repoRes.status === 404) {
      return {
        owner,
        repo,
        isLoading: false,
        error: `Repository ${owner}/${repo} not found or is private.`
      };
    }
    if (repoRes.status === 403) {
      return {
        owner,
        repo,
        isLoading: false,
        error: 'GitHub unauthenticated API rate limit (60 req/hr) reached.'
      };
    }

    const repoJson = await repoRes.json();

    // 2. Fetch Commits list (last 15)
    let commits: GitHubRepoData['commits'] = [];
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`);
      if (commitsRes.ok) {
        const commitsJson = await commitsRes.json();
        
        // Fetch detailed stats (additions, deletions, files) for each commit in parallel
        commits = await Promise.all(
          (commitsJson || []).slice(0, 10).map(async (c: any) => {
            let additions = 0;
            let deletions = 0;
            let files: any[] = [];
            let htmlUrl = c.html_url || `https://github.com/${owner}/${repo}/commit/${c.sha}`;

            try {
              const detailRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${c.sha}`);
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                additions = detailJson.stats?.additions || 0;
                deletions = detailJson.stats?.deletions || 0;
                htmlUrl = detailJson.html_url || htmlUrl;
                files = (detailJson.files || []).map((f: any) => ({
                  filename: f.filename,
                  additions: f.additions,
                  deletions: f.deletions,
                  status: f.status
                }));
              }
            } catch {
              // detail fetch non-fatal
            }

            return {
              sha: c.sha,
              shortSha: (c.sha || '').substring(0, 7),
              message: c.commit?.message || '',
              author: c.commit?.author?.name || c.author?.login || 'Unknown',
              date: c.commit?.author?.date || '',
              htmlUrl,
              additions,
              deletions,
              files
            };
          })
        );
      }
    } catch {
      // Commits fetch non-fatal
    }

    // 3. Fetch Root Contents / File Tree
    let files: GitHubRepoData['files'] = [];
    try {
      const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
      if (contentsRes.ok) {
        const contentsJson = await contentsRes.json();
        files = (contentsJson || []).map((f: any) => ({
          name: f.name,
          path: f.path,
          size: f.size,
          type: f.type === 'dir' ? 'dir' : 'file'
        }));
      }
    } catch {
      // File tree fetch non-fatal
    }

    // 4. Fetch README markdown directly via raw.githubusercontent.com
    let readmeContent: string | undefined = undefined;
    try {
      const readmeRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`);
      if (readmeRes.ok) {
        readmeContent = await readmeRes.text();
      }
    } catch {
      // README fetch non-fatal
    }

    // 5. Fetch GitHub Releases
    let releases: GitHubRepoData['releases'] = [];
    try {
      const releasesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`);
      if (releasesRes.ok) {
        const releasesJson = await releasesRes.json();
        releases = (releasesJson || []).map((r: any) => ({
          id: r.id,
          tagName: r.tag_name || '',
          name: r.name || r.tag_name || 'Release',
          body: r.body || '',
          publishedAt: r.published_at || '',
          assets: (r.assets || []).map((a: any) => ({
            name: a.name,
            size: a.size,
            downloadUrl: a.browser_download_url
          }))
        }));
      }
    } catch {
      // Releases fetch non-fatal
    }

    // 6. Identify Hardware / CAD deliverables in file tree
    const hardwareExts = ['.step', '.stp', '.kicad_pcb', '.kicad_sch', '.sch', '.brd', '.stl', '.gerber', '.gbr', '.dxf', '.f3d'];
    const hardwareFiles = files.filter(f => 
      hardwareExts.some(ext => f.name.toLowerCase().endsWith(ext))
    );

    return {
      owner,
      repo,
      fullName: repoJson.full_name || `${owner}/${repo}`,
      description: repoJson.description || '',
      stars: repoJson.stargazers_count ?? 0,
      forks: repoJson.forks_count ?? 0,
      openIssues: repoJson.open_issues_count ?? 0,
      language: repoJson.language || '',
      license: repoJson.license?.name || '',
      defaultBranch: repoJson.default_branch || 'main',
      createdAt: repoJson.created_at || '',
      updatedAt: repoJson.updated_at || '',
      pushedAt: repoJson.pushed_at || '',
      commits,
      files,
      releases,
      hardwareFiles,
      readmeContent,
      isLoading: false
    };
  } catch (err: any) {
    return {
      owner,
      repo,
      isLoading: false,
      error: err.message || 'Failed to connect to GitHub API'
    };
  }
}

/**
 * Fetches Hackatime public user stats and projects
 */
export async function fetchHackatimeData(hackatimeId: string): Promise<Partial<HackatimeProjectStats>> {
  if (!hackatimeId || !hackatimeId.trim()) {
    return {
      isLoading: false,
      error: 'No Hackatime ID provided'
    };
  }

  const cleanId = hackatimeId.trim();

  try {
    // 1. Fetch User Stats
    const statsRes = await fetch(`https://hackatime.hackclub.com/api/v1/users/${cleanId}/stats`);
    let statsData: any = null;
    if (statsRes.ok) {
      statsData = await statsRes.json();
    }

    // 2. Fetch User Projects
    let projects: string[] = [];
    try {
      const projectsRes = await fetch(`https://hackatime.hackclub.com/api/v1/users/${cleanId}/projects`);
      if (projectsRes.ok) {
        const projJson = await projectsRes.json();
        projects = projJson.projects || [];
      }
    } catch {
      // Projects fetch non-fatal
    }

    const d = statsData?.data || {};

    return {
      username: d.username || `User #${cleanId}`,
      totalSeconds: d.total_seconds || 0,
      totalHoursReadable: d.human_readable_total || '0h',
      projects,
      languages: (d.languages || []).map((l: any) => ({
        name: l.name,
        text: l.text,
        hours: l.hours,
        percent: l.percent,
        color: l.color
      })),
      isLoading: false
    };
  } catch (err: any) {
    return {
      isLoading: false,
      error: err.message || 'Unable to connect to Hackatime API'
    };
  }
}

/**
 * Manifest & Halceon Double-Dipping Checker
 */
export async function fetchManifestLookup(codeUrl: string, username: string): Promise<ManifestLookupData> {
  const halceonUrl = `https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(username || 'user')}`;

  if (!codeUrl || !codeUrl.trim()) {
    return {
      isLoading: false,
      isRegistered: false,
      otherSubmissions: [],
      halceonUrl
    };
  }

  try {
    const res = await fetch(`https://manifest.hackclub.com/api/lookup?codeUrl=${encodeURIComponent(codeUrl.trim())}`);
    
    if (res.status === 404) {
      // 404 = clean, never submitted to another YSWS in Manifest
      return {
        isLoading: false,
        isRegistered: false,
        otherSubmissions: [],
        halceonUrl
      };
    }

    if (res.ok) {
      const data = await res.json();
      const submissions = (data.submissions || []).map((s: any) => ({
        submissionId: s.submissionId || '',
        yswsName: s.yswsName || s.ysws || 'Other YSWS',
        shipStatus: s.shipStatus || 'draft',
        hoursShipped: s.hoursShipped ?? null,
        approvedAt: s.approvedAt || null,
        createdAt: s.createdAt || ''
      }));

      return {
        isLoading: false,
        isRegistered: true,
        otherSubmissions: submissions,
        halceonUrl
      };
    }

    return {
      isLoading: false,
      isRegistered: false,
      otherSubmissions: [],
      halceonUrl
    };
  } catch (err: any) {
    return {
      isLoading: false,
      isRegistered: false,
      otherSubmissions: [],
      halceonUrl,
      error: 'Manifest lookup unreachable'
    };
  }
}

// =============================================================
// Cockpit Server API Client (/api)
// =============================================================

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchCockpitProjects(filters?: {
  status?: string;
  type?: string;
  search?: string;
}): Promise<{ projects: CockpitProject[]; stats: QueueStats }> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
  if (filters?.search) params.set('search', filters.search);

  const res = await fetch(`/api/projects?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  return res.json();
}

export async function fetchCockpitProject(id: string): Promise<{
  project: CockpitProject;
  auditHistory: AuditLogEntry[];
  verdict?: VerdictDetails;
}> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Failed to fetch project ${id}: ${res.statusText}`);
  return res.json();
}

export async function submitCockpitVerdict(
  payload: SubmitVerdictRequest
): Promise<{ ok: boolean; verdict: VerdictDetails; project: CockpitProject; stats: QueueStats }> {
  const res = await fetch('/api/verdicts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to submit verdict');
  }
  return res.json();
}

export async function fetchPreapprovedQueue(): Promise<{
  items: PreapprovedExportItem[];
  count: number;
}> {
  const res = await fetch('/api/preapproved');
  if (!res.ok) throw new Error(`Failed to fetch pre-approved queue: ${res.statusText}`);
  return res.json();
}

export async function syncProjectsFromLive(dump: any): Promise<{
  ok: boolean;
  processed: number;
  created: number;
  updated: number;
  unchanged: number;
}> {
  const res = await fetch('/api/sync/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dump),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to sync projects');
  }
  return res.json();
}

export async function saveProjectNote(
  id: string,
  note: string,
  actor = 'reviewer'
): Promise<{ ok: boolean; entry: AuditLogEntry }> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, actor }),
  });
  if (!res.ok) throw new Error(`Failed to save note: ${res.statusText}`);
  return res.json();
}

export async function fetchCockpitStats(): Promise<QueueStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error(`Failed to fetch stats: ${res.statusText}`);
  return res.json();
}
