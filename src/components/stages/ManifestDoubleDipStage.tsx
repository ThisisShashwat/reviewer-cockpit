import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  History,
  RefreshCw,
  Search,
  Ship,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Archive,
  FileCode,
  Globe,
  Image as ImageIcon,
  GitCommit,
} from 'lucide-react';
import { fetchHalceonProfile, fetchManifestLookup, fetchArchiveCommit } from '../../lib/api';
import {
  CockpitProject,
  HalceonProfileData,
  HalceonShipLink,
  ManifestLookupData,
  ArchiveCommitInfo,
  GitHubRepoData,
} from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface ManifestDoubleDipStageProps {
  project: CockpitProject;
  allProjects?: CockpitProject[];
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  onApplyDeltaHours?: (hours: number, justification: string) => void;
  reviewChecklist?: Record<string, any>;
  onToggleChecklist?: (key: string, status?: any) => void;
  onBaselineCommitDiscovered?: (info: {
    commitHash: string;
    shortHash: string;
    shipName: string;
    archiveUrl: string;
    program?: string;
    hours?: number;
  }) => void;
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

const ExpandableDescription: React.FC<{ text: string; maxLen?: number }> = ({
  text,
  maxLen = 140,
}) => {
  const [expanded, setExpanded] = useState(false);
  const clean = decodeHtmlEntities(text);

  if (!clean) return <span className="text-[#71717a] italic">No description provided</span>;
  if (clean.length <= maxLen) return <span className="text-[#d4d4d8] leading-relaxed">{clean}</span>;

  return (
    <div className="space-y-1">
      <p className="text-[#d4d4d8] leading-relaxed whitespace-pre-wrap">
        {expanded ? clean : `${clean.slice(0, maxLen)}...`}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-[11px] font-semibold text-brand-orange hover:underline inline-flex items-center gap-0.5 cursor-pointer"
      >
        {expanded ? (
          <>
            <span>View less</span>
            <ChevronUp className="w-3 h-3" />
          </>
        ) : (
          <>
            <span>View more</span>
            <ChevronDown className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
};

// In-memory module-level caches to avoid refetching across tab switches
const manifestCache = new Map<string, ManifestLookupData>();
const halceonCache = new Map<string, HalceonProfileData>();
const archiveCommitCache = new Map<string, ArchiveCommitInfo>();

export const ManifestDoubleDipStage: React.FC<ManifestDoubleDipStageProps> = ({
  project,
  allProjects = [],
  gitHubData,
  onAdvance,
  onEarlyExit,
  onApplyDeltaHours: _onApplyDeltaHours,
  reviewChecklist = {},
  onToggleChecklist,
  onBaselineCommitDiscovered,
}) => {
  const cacheKey = `${project.codeUrl}:${project.githubUsername}`;
  const [_manifestData, setManifestData] = useState<ManifestLookupData | null>(
    () => manifestCache.get(cacheKey) || null
  );
  const [halceonData, setHalceonData] = useState<HalceonProfileData | null>(
    () => halceonCache.get(project.githubUsername) || null
  );
  const [archiveCommitData, setArchiveCommitData] = useState<ArchiveCommitInfo | null>(null);
  const [archiveCommitLoading, setArchiveCommitLoading] = useState(false);
  const [manualBaselineSha, setManualBaselineSha] = useState('');
  const [inputSha, setInputSha] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !halceonCache.has(project.githubUsername)
  );
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  useEffect(() => {
    let mounted = true;
    const isCached = halceonCache.has(project.githubUsername) && manifestCache.has(cacheKey);
    if (!isCached) {
      setIsLoading(true);
    }

    Promise.all([
      fetchManifestLookup(project.codeUrl, project.githubUsername),
      fetchHalceonProfile(project.githubUsername),
    ])
      .then(([manRes, halRes]) => {
        manifestCache.set(cacheKey, manRes);
        halceonCache.set(project.githubUsername, halRes);
        if (mounted) {
          setManifestData(manRes);
          setHalceonData(halRes);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [project.codeUrl, project.githubUsername, cacheKey]);

  // Consolidate past submissions by this submitter from the local database
  const userPastLiveSubmissions = allProjects.filter((p) => {
    if (p.id === project.id) return false;
    const sameGithub =
      project.githubUsername &&
      p.githubUsername &&
      p.githubUsername.toLowerCase() === project.githubUsername.toLowerCase();
    const sameHackatime =
      project.hackatimeId &&
      p.hackatimeId &&
      p.hackatimeId.toLowerCase() === project.hackatimeId.toLowerCase();
    return sameGithub || sameHackatime;
  });

  // Cross-program ships from Halceon
  const halceonShips = halceonData?.ships || [];
  const halceonTotalShips = halceonData?.totalShips || halceonShips.length;
  const halceonTotalHours = halceonData?.totalHours || halceonShips.reduce((s, x) => s + x.hours, 0);

  // Check if current repo was previously shipped in Halceon
  const repoClean = (project.codeUrl || '')
    .toLowerCase()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .trim();

  const matchingHalceonShip = halceonShips.find((s) => {
    const halceonRepoClean = (s.repo || '').toLowerCase().replace(/\.git$/, '').trim();
    return repoClean && halceonRepoClean && (halceonRepoClean.includes(repoClean) || repoClean.includes(halceonRepoClean));
  });

  // Distinctly extract each link type for the matching ship
  const priorRepoArchive =
    matchingHalceonShip?.parsedLinks?.find(
      (l) => l.type === 'archive_repo' || l.label.toLowerCase().includes('repo*')
    ) ||
    matchingHalceonShip?.parsedLinks?.find(
      (l) => l.isArchive && !l.label.toLowerCase().includes('demo')
    );

  const priorDemoArchive =
    matchingHalceonShip?.parsedLinks?.find(
      (l) => l.type === 'archive_demo' || l.label.toLowerCase().includes('demo*')
    );

  const priorRepoLink =
    matchingHalceonShip?.parsedLinks?.find(
      (l) => l.type === 'repo' || (!l.isArchive && l.url.includes('github.com'))
    );

  const priorDemoLink =
    matchingHalceonShip?.parsedLinks?.find(
      (l) =>
        l.type === 'demo' ||
        (!l.isArchive && !l.url.includes('github.com') && !l.label.toLowerCase().includes('img'))
    );

  const usedPriorUrls = new Set(
    [
      priorRepoLink?.url,
      priorDemoLink?.url,
      priorRepoArchive?.url,
      priorDemoArchive?.url,
    ].filter(Boolean) as string[]
  );

  const otherPriorLinks = (matchingHalceonShip?.parsedLinks || []).filter(
    (l) => !usedPriorUrls.has(l.url)
  );

  // The git repo archive specifically used for git ls-remote commit inspection
  const priorRepoArchiveUrl =
    priorRepoArchive?.url ||
    (project.archiveUrl && !project.archiveUrl.includes('demo') ? project.archiveUrl : undefined);

  // Programmatically fetch archive commit hash using the REPO archive
  useEffect(() => {
    if (!priorRepoArchiveUrl) {
      setArchiveCommitData(null);
      return;
    }
    if (!priorRepoArchiveUrl.includes('archive.hackclub.com')) {
      return;
    }

    const cached = archiveCommitCache.get(priorRepoArchiveUrl);
    if (cached) {
      setArchiveCommitData(cached);
      if (cached.success && cached.commitHash && onBaselineCommitDiscovered && matchingHalceonShip) {
        onBaselineCommitDiscovered({
          commitHash: cached.commitHash,
          shortHash: cached.shortHash || cached.commitHash.slice(0, 7),
          shipName: matchingHalceonShip.repo,
          archiveUrl: priorRepoArchiveUrl,
          program: matchingHalceonShip.program,
          hours: matchingHalceonShip.hours,
        });
      }
      return;
    }

    let mounted = true;
    setArchiveCommitLoading(true);
    fetchArchiveCommit(priorRepoArchiveUrl)
      .then((data) => {
        archiveCommitCache.set(priorRepoArchiveUrl, data);
        if (mounted) {
          setArchiveCommitData(data);
          if (data.success && data.commitHash && onBaselineCommitDiscovered && matchingHalceonShip) {
            onBaselineCommitDiscovered({
              commitHash: data.commitHash,
              shortHash: data.shortHash || data.commitHash.slice(0, 7),
              shipName: matchingHalceonShip.repo,
              archiveUrl: priorRepoArchiveUrl,
              program: matchingHalceonShip.program,
              hours: matchingHalceonShip.hours,
            });
          }
        }
      })
      .catch((err) => {
        if (mounted) {
          setArchiveCommitData({ success: false, error: err.message || 'Inspection failed' });
        }
      })
      .finally(() => {
        if (mounted) setArchiveCommitLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [
    priorRepoArchiveUrl,
    matchingHalceonShip?.repo,
    matchingHalceonShip?.program,
    matchingHalceonShip?.hours,
    onBaselineCommitDiscovered,
  ]);

  // GitHub Commits Comparison Logic
  const rawCommits = gitHubData?.commits || [];
  const latestCommit = rawCommits[0];

  const effectiveBaselineHash = manualBaselineSha || archiveCommitData?.commitHash;
  const effectiveShortHash = effectiveBaselineHash ? effectiveBaselineHash.slice(0, 7) : undefined;

  const baselineIndex = useMemo(() => {
    if (!effectiveBaselineHash) return -1;
    return rawCommits.findIndex(
      (c) =>
        c.sha.toLowerCase().startsWith(effectiveBaselineHash.toLowerCase().slice(0, 7)) ||
        effectiveBaselineHash.toLowerCase().startsWith(c.sha.toLowerCase().slice(0, 7))
    );
  }, [rawCommits, effectiveBaselineHash]);

  const isHeadIdenticalToBaseline = baselineIndex === 0;
  const newCommits = baselineIndex > 0 ? rawCommits.slice(0, baselineIndex) : [];
  const newCommitsCount =
    baselineIndex > 0
      ? baselineIndex
      : baselineIndex === -1 && effectiveBaselineHash && rawCommits.length > 0
      ? rawCommits.length
      : 0;

  // Check if similar project name exists in past ships
  const currentProjNameClean = project.projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const similarHalceonShip = halceonShips.find((s) => {
    const otherClean = s.repo.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      s !== matchingHalceonShip &&
      currentProjNameClean.length >= 4 &&
      (otherClean.includes(currentProjNameClean) || currentProjNameClean.includes(otherClean))
    );
  });

  const similarLiveSubmission = userPastLiveSubmissions.find((p) => {
    const otherClean = p.projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return (
      currentProjNameClean.length >= 4 &&
      (otherClean.includes(currentProjNameClean) || currentProjNameClean.includes(otherClean))
    );
  });

  const isDoubleDipDetected = Boolean(matchingHalceonShip);

  const detectedProgramName =
    matchingHalceonShip?.program ||
    similarHalceonShip?.program ||
    (project.archiveUrl?.includes('high-seas') ? 'High Seas' :
     project.archiveUrl?.includes('arcade') ? 'Arcade' :
     project.archiveUrl?.includes('blot') ? 'Blot' :
     project.archiveUrl?.includes('stardance') ? 'Stardance' :
     project.archiveUrl?.includes('sprig') ? 'Sprig' : undefined);

  // Sync detected program name with reviewChecklist
  useEffect(() => {
    if (detectedProgramName && reviewChecklist?.['double_dipped_program'] !== detectedProgramName) {
      onToggleChecklist?.('double_dipped_program', detectedProgramName);
    }
  }, [detectedProgramName, onToggleChecklist, reviewChecklist]);

  // Sync archive commit hashes to reviewChecklist
  useEffect(() => {
    if (archiveCommitData?.success && archiveCommitData.commitHash) {
      const short = archiveCommitData.shortHash || archiveCommitData.commitHash.slice(0, 7);
      if (reviewChecklist?.['archive_short_hash'] !== short) {
        onToggleChecklist?.('archive_short_hash', short);
        onToggleChecklist?.('archive_commit_hash', archiveCommitData.commitHash);
      }
    }
  }, [archiveCommitData, onToggleChecklist, reviewChecklist]);

  const handlePass = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, true);
      if (key === 'stage1_double_dip_checked') {
        onToggleChecklist('stage1_halceon_reviewed', true);
        onToggleChecklist('zero_progress_blocked', false);
        onToggleChecklist('flag_potential_double_dip', false);
      } else if (key === 'stage1_halceon_reviewed') {
        onToggleChecklist('stage1_double_dip_checked', true);
        onToggleChecklist('zero_progress_blocked', false);
        onToggleChecklist('flag_potential_double_dip', false);
      }
    }
  };

  const handleFail = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, false);
      if (key === 'stage1_double_dip_checked') {
        onToggleChecklist('stage1_halceon_reviewed', false);
        if (detectedProgramName) {
          onToggleChecklist('double_dipped_program', detectedProgramName);
        }
      } else if (key === 'stage1_halceon_reviewed') {
        onToggleChecklist('stage1_double_dip_checked', false);
        if (detectedProgramName) {
          onToggleChecklist('double_dipped_program', detectedProgramName);
        }
      }
    }
  };

  // Helper to format ship links with 1 to 4+ items accurately
  const getParsedLinks = (ship: typeof halceonShips[0]): HalceonShipLink[] => {
    if (ship.parsedLinks && ship.parsedLinks.length > 0) {
      return ship.parsedLinks;
    }
    // Fallback if parsedLinks was not set
    return (ship.links || []).map((l) => {
      const isArch = l.includes('archive.hackclub.com') || l.includes('archive.org');
      const isRep = l.includes('github.com');
      return {
        label: isArch ? 'archive' : isRep ? 'repo' : `demo`,
        url: l,
        isArchive: isArch,
        type: isArch ? (isRep ? 'archive_repo' : 'archive_demo') : isRep ? 'repo' : 'demo',
      };
    });
  };

  const renderActionControls = (position: 'top' | 'bottom') => (
    <div
      className={`flex items-center justify-between w-full ${
        position === 'bottom' ? 'pt-4 border-t border-border-subtle shrink-0' : 'shrink-0'
      }`}
    >
      {isFlagging ? (
        <div className="flex items-center gap-2 flex-1 max-w-lg mr-4">
          <input
            type="text"
            value={flagNote}
            onChange={(e) => setFlagNote(e.target.value)}
            placeholder="Reason for double-dip concern..."
            className="text-xs px-3.5 py-2 rounded-xl border border-[#3f3f46] bg-[#18181b] text-white placeholder-[#71717a] flex-1 focus:outline-none focus:border-rose-500 transition-colors shadow-inner"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              onToggleChecklist?.('stage1_double_dip_checked', false);
              onToggleChecklist?.('stage1_halceon_reviewed', false);
              onToggleChecklist?.('flag_potential_double_dip', true);
              if (detectedProgramName) {
                onToggleChecklist?.('double_dipped_program', detectedProgramName);
              }
              if (flagNote.trim()) {
                onToggleChecklist?.('note_double_dip', flagNote.trim());
              }
              if (onEarlyExit && flagNote.trim()) {
                onEarlyExit(`Double-Dip Concern: ${flagNote.trim()}`);
              } else if (onEarlyExit) {
                onEarlyExit(`Double-Dip Flagged from ${detectedProgramName || 'prior program'}`);
              }
              setIsFlagging(false);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shrink-0 shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Confirm Flag</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFlagging(false)}
            className="px-3 py-2 text-xs text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsFlagging(true)}
          className="px-3.5 py-2 rounded-xl bg-[#18181b] border border-amber-500/50 text-amber-300 hover:bg-rose-950/60 hover:text-rose-200 hover:border-rose-500/60 text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Flag Potential Double-Dip</span>
        </button>
      )}

      <button
        type="button"
        onClick={onAdvance}
        className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs shrink-0 ml-auto"
      >
        <span>Next: README & Deliverables →</span>
      </button>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 1 of 7
            </span>
            <span className="text-xs text-content-tertiary">Cross-Program Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Consolidated Past Submissions (Live & Halceon Unified)
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit submitter @<strong className="text-content-primary">{project.githubUsername}</strong> across all Hack Club programs (Stardance, Arcade, High Seas, Blot, Horizons) directly inline without external context switches.
          </p>
        </div>

        <a
          href={`https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(
            project.githubUsername
          )}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Halceon Web Profile</span>
          <ExternalLink className="w-3 h-3 text-content-muted" />
        </a>
      </div>

      {/* Top Action Controls Bar */}
      {renderActionControls('top')}

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Fetching submitter&apos;s complete ship history from Halceon Unified database...</span>
        </div>
      ) : (
        <>
          {/* Critical Double-Dip Alert & Archive Comparison Panel */}
          {isDoubleDipDetected && matchingHalceonShip ? (
            <div className="p-6 rounded-2xl bg-[#121214] border border-amber-500/50 text-white space-y-5 shadow-2xl">
              {/* Header: Identified Colliding Prior Ship */}
              <div className="space-y-3 border-b border-[#27272a] pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      CRITICAL DOUBLE-DIP DETECTED
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-purple-900/40 text-purple-300 border border-purple-500/30">
                      Program: {matchingHalceonShip.program}
                    </span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {matchingHalceonShip.hours} hrs approved
                    </span>
                    {matchingHalceonShip.approvedAt && (
                      <span className="text-xs font-mono text-[#a1a1aa]">
                        ({matchingHalceonShip.approvedAt})
                      </span>
                    )}
                  </div>

                  {/* Compact Quick Action Links matching bottom table format */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <span className="text-[10px] uppercase text-[#71717a] font-semibold mr-0.5">
                      Links:
                    </span>
                    {priorRepoLink && (
                      <a
                        href={priorRepoLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-blue-950/60 text-blue-300 border border-blue-500/40 hover:bg-blue-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Open previously approved GitHub repository"
                      >
                        <FileCode className="w-3 h-3 text-blue-400" />
                        <span>repo</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}

                    {priorDemoLink && (
                      <a
                        href={priorDemoLink.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Open previously approved live demo"
                      >
                        <Globe className="w-3 h-3 text-emerald-400" />
                        <span>demo</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}

                    {priorRepoArchive && (
                      <a
                        href={priorRepoArchive.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-purple-950/60 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Download prior git repository archive snapshot"
                      >
                        <Archive className="w-3 h-3 text-purple-400" />
                        <span>repo*</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}

                    {priorDemoArchive && (
                      <a
                        href={priorDemoArchive.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-amber-950/60 text-amber-300 border border-amber-500/40 hover:bg-amber-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Download prior demo archive snapshot"
                      >
                        <Archive className="w-3 h-3 text-amber-400" />
                        <span>demo*</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    )}

                    {otherPriorLinks.map((ol, oIdx) => (
                      <a
                        key={oIdx}
                        href={ol.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[#27272a] text-[#d4d4d8] hover:text-white border border-[#3f3f46] transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{ol.label}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* Prior Approved Repo Name - Single-line, readable font size */}
                <div className="flex items-center gap-2 text-xs pt-1 truncate">
                  <span className="text-[#a1a1aa] shrink-0 font-medium">Prior Approved Repo:</span>
                  <span className="text-white font-mono font-bold truncate">
                    {matchingHalceonShip.repo}
                  </span>
                </div>

                {/* Description: Full-width coverage, no cramping */}
                {matchingHalceonShip.description && (
                  <div className="text-xs text-[#d4d4d8] pt-1 w-full leading-relaxed">
                    <ExpandableDescription text={matchingHalceonShip.description} maxLen={280} />
                  </div>
                )}
              </div>

              {/* Policy Explanation */}
              <div className="space-y-1.5 text-xs text-[#d4d4d8] leading-relaxed bg-[#18181b] p-3.5 rounded-xl border border-[#27272a]">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Double-Dip Evaluation Rules
                </h4>
                <p>
                  Submitters <strong>cannot be credited twice for the same work</strong>. Continuing a project across programs (e.g. {matchingHalceonShip.program} → Horizons) is permitted, but <strong>strictly for new commits pushed after the previously approved ship</strong>. Do NOT simply subtract past hours ({matchingHalceonShip.hours}h) from claimed hours ({project.submittedHours}h). Evaluate the exact commit diff from the baseline hash to HEAD.
                </p>
              </div>

              {/* Commit Comparison & Baseline Discovery */}
              {archiveCommitLoading ? (
                <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-[#a1a1aa] flex items-center gap-3 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-orange shrink-0" />
                  <div>
                    <span className="font-bold text-white block">
                      Inspecting prior repo archive snapshot ({priorRepoArchiveUrl || 'archive repository'})...
                    </span>
                    <span className="text-[11px] text-[#71717a]">
                      Running git ls-remote to discover the exact baseline approved commit hash.
                    </span>
                  </div>
                </div>
              ) : effectiveBaselineHash ? (
                <div className="p-5 rounded-xl bg-[#18181b] border border-purple-500/40 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                    <div className="flex items-center gap-2">
                      <GitCommit className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Baseline vs Current HEAD Comparison
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#a1a1aa]">Baseline Approved Hash:</span>
                      <code className="text-emerald-400 bg-black/60 px-2 py-0.5 rounded font-mono font-bold text-xs border border-emerald-500/30">
                        {effectiveShortHash}
                      </code>
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: Prior Ship Baseline Commit */}
                    <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <Archive className="w-3.5 h-3.5 text-purple-400" />
                          <span>Previously Approved Commit (Baseline)</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#27272a] px-1.5 py-0.5 rounded">
                          {matchingHalceonShip.program}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-white bg-black/50 px-2 py-0.5 rounded">
                            {effectiveShortHash}
                          </code>
                          {archiveCommitData?.archiveId && (
                            <span className="text-[10px] font-mono text-[#a1a1aa]">
                              Ref: {archiveCommitData.archiveId}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                          Approved on {matchingHalceonShip.approvedAt} for {matchingHalceonShip.hours} hours.
                        </p>
                      </div>
                      <div className="pt-1">
                        <a
                          href={`${project.codeUrl}/commit/${effectiveBaselineHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-purple-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Baseline Commit on GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Right: Current Submitted Repository HEAD */}
                    <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-blue-400" />
                          <span>Current Submitted HEAD</span>
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                          Latest Push
                        </span>
                      </div>
                      {latestCommit ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono font-bold text-white bg-black/50 px-2 py-0.5 rounded">
                              {latestCommit.shortSha}
                            </code>
                            <span className="text-[11px] text-[#d4d4d8] truncate max-w-[200px]" title={latestCommit.message}>
                              {latestCommit.message}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#a1a1aa]">
                            By @{latestCommit.author} {latestCommit.date ? `on ${new Date(latestCommit.date).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-[#71717a] italic">Loading repository HEAD commit...</p>
                      )}
                      <div className="pt-1">
                        {latestCommit && (
                          <a
                            href={`${project.codeUrl}/commit/${latestCommit.sha}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Latest Commit on GitHub</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA: Compare New Work on GitHub */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#121214] border border-[#27272a]">
                    <div className="text-xs text-[#d4d4d8]">
                      <span className="font-semibold text-white">Compare incremental additions:</span>
                      <span className="text-[#a1a1aa] block text-[11px]">
                        GitHub comparison diff isolating only commits pushed after baseline {effectiveShortHash}
                      </span>
                    </div>

                    <a
                      href={`${project.codeUrl}/compare/${effectiveBaselineHash}...HEAD`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
                    >
                      <span>Inspect Changes ({effectiveShortHash}...HEAD)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Zero Progress Blocker or New Progress List */}
                  {isHeadIdenticalToBaseline ? (
                    <div className="p-4 rounded-xl bg-[#2b080d] border-2 border-rose-600 text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                      <div className="flex items-center gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="font-bold text-rose-200 block text-sm">
                            Zero Progress Double-Dip Detected!
                          </span>
                          <p className="text-rose-200/90 leading-relaxed">
                            Repository HEAD ({latestCommit?.shortSha}) is IDENTICAL to the baseline commit ({effectiveShortHash}) previously approved in &ldquo;{matchingHalceonShip.program}&rdquo;. Zero new commits were made since prior ship!
                          </p>
                        </div>
                      </div>

                      {onEarlyExit && (
                        <button
                          type="button"
                          onClick={() => {
                            onToggleChecklist?.('archive_progression_verified', false);
                            onToggleChecklist?.('stage1_double_dip_checked', false);
                            onToggleChecklist?.('stage1_halceon_reviewed', false);
                            onToggleChecklist?.('zero_progress_blocked', true);
                            if (matchingHalceonShip?.program) {
                              onToggleChecklist?.('double_dipped_program', matchingHalceonShip.program);
                            }
                            if (effectiveShortHash) {
                              onToggleChecklist?.('archive_short_hash', effectiveShortHash);
                            }
                            if (archiveCommitData?.commitHash) {
                              onToggleChecklist?.('archive_commit_hash', archiveCommitData.commitHash);
                            }
                            onEarlyExit?.(
                              `Zero Progress Double-Dip: Repository HEAD is identical to previously approved archive commit (${effectiveShortHash}) from "${matchingHalceonShip.repo}" in ${matchingHalceonShip.program}`
                            );
                          }}
                          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 shadow-md transition-colors cursor-pointer"
                        >
                          Reject for Zero Progress
                        </button>
                      )}
                    </div>
                  ) : newCommitsCount > 0 ? (
                    <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>New Progress Verified ({newCommitsCount} new commit{newCommitsCount > 1 ? 's' : ''} pushed after baseline {effectiveShortHash})</span>
                      </div>
                      <div className="space-y-1.5 pt-1 max-h-40 overflow-y-auto">
                        {newCommits.map((c) => (
                          <div key={c.sha} className="flex items-center justify-between p-2 rounded bg-black/40 text-xs font-mono">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-emerald-400 font-bold">{c.shortSha}</span>
                              <span className="text-[#d4d4d8] truncate text-[11px]">{c.message}</span>
                            </div>
                            <span className="text-[10px] text-[#71717a] shrink-0 ml-2">
                              {c.date ? new Date(c.date).toLocaleDateString() : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                /* Archive Commit Inspection Warning & Manual Input Fallback */
                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <span className="font-bold text-amber-300 block">
                        Could not automatically resolve baseline git commit from archive
                      </span>
                      <p className="text-amber-200/90 leading-relaxed text-[11px]">
                        {archiveCommitData?.error || 'No git references found in archive repository.'} You can inspect the prior repo snapshot directly using the buttons above, or paste the baseline commit SHA below to unlock the side-by-side comparison.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={inputSha}
                      onChange={(e) => setInputSha(e.target.value)}
                      placeholder="Paste baseline commit SHA (e.g. dd8e2cd)..."
                      className="px-3 py-1.5 rounded-lg bg-black/60 border border-[#3f3f46] text-white text-xs font-mono flex-1 focus:outline-none focus:border-brand-orange"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (inputSha.trim()) {
                          setManualBaselineSha(inputSha.trim());
                          if (onBaselineCommitDiscovered && matchingHalceonShip) {
                            onBaselineCommitDiscovered({
                              commitHash: inputSha.trim(),
                              shortHash: inputSha.trim().slice(0, 7),
                              shipName: matchingHalceonShip.repo,
                              archiveUrl: priorRepoArchiveUrl || '',
                              program: matchingHalceonShip.program,
                              hours: matchingHalceonShip.hours,
                            });
                          }
                        }
                      }}
                      disabled={!inputSha.trim()}
                      className="px-3 py-1.5 rounded-lg bg-brand-orange hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Apply Baseline
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : similarHalceonShip || similarLiveSubmission ? (
            <div className="p-5 rounded-2xl bg-[#121214] border border-amber-500/40 text-white flex items-start gap-3 text-xs shadow-xl">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block text-sm">
                  Similarity Notice: Prior Project with Similar Name Detected
                </span>
                <span className="text-amber-200/90 mt-0.5 block">
                  Prior submission &ldquo;{similarHalceonShip ? similarHalceonShip.repo : similarLiveSubmission?.projectName}&rdquo; detected. Verify that code is distinct and not duplicated.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#121214] border border-emerald-500/30 text-white flex items-center justify-between text-xs shadow-lg">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-400 block">Automated Cross-Check: Clean Submission</span>
                  <span className="text-[#a1a1aa] block text-[11px] mt-0.5">
                    No duplicate repositories or conflicting prior approvals detected in Halceon Unified or Hack Club Live records.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                0 Prior Collisions
              </span>
            </div>
          )}

          {/* Card 2: Stage 1 Verification Checklist (Directly after Double Dip evaluation) */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg shrink-0">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Stage 1 Verification: Submitter Track Record & History
              </h3>
              <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
            </div>

            <div className="space-y-2.5">
              <PassFailControl
                label="Cross-Program Double-Dipping & Prior Ships"
                description={
                  matchingHalceonShip
                    ? `Prior submission "${matchingHalceonShip.repo}" found in ${matchingHalceonShip.program} (${matchingHalceonShip.hours}h). Must demonstrate genuine new work beyond baseline.`
                    : similarHalceonShip
                    ? `Similar submission "${similarHalceonShip.repo}" found in ${similarHalceonShip.program}. Verify code uniqueness.`
                    : `Verified clean cross-program history (${halceonTotalShips} prior ships inspected across Arcade, High Seas, Blot, etc.). No uncredited duplicate resubmissions.`
                }
                status={reviewChecklist['stage1_double_dip_checked']}
                onPass={() => handlePass('stage1_double_dip_checked')}
                onFail={() => handleFail('stage1_double_dip_checked')}
              />

              <PassFailControl
                label="Live Submissions History Audited"
                description="Verified past submissions in Hack Club Live for this user."
                status={reviewChecklist['stage1_live_reviewed']}
                onPass={() => handlePass('stage1_live_reviewed')}
                onFail={() => handleFail('stage1_live_reviewed')}
              />
            </div>
          </div>

          {/* Section 1: Halceon Unified Ships (Card-based, displays 1 to 4+ links with full archive verification) */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Ship className="w-4 h-4 text-brand-orange" />
                Halceon Unified Submissions ({halceonTotalShips} ships across programs)
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#1f1f23] border border-[#27272a] text-[#a1a1aa]">
                {halceonTotalHours} hrs shipped total
              </span>
            </div>

            {halceonShips.length === 0 ? (
              <div className="py-4 text-xs text-[#a1a1aa] bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                No past ships recorded in the Halceon Unified database for @{project.githubUsername}.
              </div>
            ) : (
              <div className="space-y-3">
                {halceonShips.map((ship, idx) => {
                  const shipLinks = getParsedLinks(ship);
                  const hasArchive = shipLinks.some((l) => l.isArchive);

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                            {decodeHtmlEntities(ship.program)}
                          </span>
                          <span className="font-mono font-bold text-white text-xs truncate">
                            {decodeHtmlEntities(ship.repo)}
                          </span>
                          {ship.approvedAt && (
                            <span className="text-[11px] text-[#71717a] font-mono">
                              Approved {ship.approvedAt}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-xs text-amber-400 px-2 py-0.5 rounded bg-[#27272a]">
                            {ship.hours} hrs
                          </span>
                        </div>
                      </div>

                      <ExpandableDescription text={ship.description} />

                      {/* Display ALL 1 to 4+ Links with Accurate Badges */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#27272a]/60 flex-wrap">
                        <span className="text-[10px] uppercase text-[#71717a] font-semibold">
                          Links ({shipLinks.length}):
                        </span>
                        {shipLinks.map((link, lIdx) => {
                          const isArch = link.isArchive;
                          const isRep = link.type === 'repo' || link.type === 'archive_repo';
                          const isDem = link.type === 'demo' || link.type === 'archive_demo';
                          const isImg = link.type === 'image';

                          return (
                            <a
                              key={lIdx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors inline-flex items-center gap-1.5 ${
                                isArch
                                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60'
                                  : isRep
                                  ? 'bg-blue-950/60 text-blue-300 border border-blue-500/40 hover:bg-blue-900/60'
                                  : isDem
                                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60'
                                  : isImg
                                  ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:text-white'
                                  : 'bg-[#27272a] text-[#d4d4d8] hover:text-white'
                              }`}
                            >
                              {isArch ? (
                                <Archive className="w-3 h-3 text-purple-400" />
                              ) : isRep ? (
                                <FileCode className="w-3 h-3 text-blue-400" />
                              ) : isDem ? (
                                <Globe className="w-3 h-3 text-emerald-400" />
                              ) : isImg ? (
                                <ImageIcon className="w-3 h-3 text-zinc-400" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              <span>{decodeHtmlEntities(link.label || (isArch ? 'Archive' : link.type))}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          );
                        })}

                        {hasArchive ? (
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 ml-auto">
                            <CheckCircle2 className="w-3 h-3" /> Archive Preserved
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400/80 font-mono flex items-center gap-1 ml-auto">
                            <AlertTriangle className="w-3 h-3" /> Archive Missing
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Hack Club Live Database Submissions */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <History className="w-4 h-4 text-brand-orange" />
                Hack Club Live Submissions ({userPastLiveSubmissions.length} other in Live)
              </h3>
              <span className="text-xs text-[#a1a1aa] font-mono">
                @{project.githubUsername}
              </span>
            </div>

            {userPastLiveSubmissions.length === 0 ? (
              <div className="py-4 text-xs text-[#a1a1aa] bg-[#18181b] p-3 rounded-xl border border-[#27272a]">
                This is submitter&apos;s only Live submission currently in the database.
              </div>
            ) : (
              <div className="space-y-3">
                {userPastLiveSubmissions.map((past) => (
                  <div
                    key={past.id}
                    className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-bold text-white text-xs">
                          {decodeHtmlEntities(past.projectName)}
                        </span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono uppercase bg-[#27272a] text-[#a1a1aa]">
                          {past.projectType}
                        </span>
                        <span className="text-[11px] text-[#71717a] font-mono">
                          {new Date(past.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-xs text-white px-2 py-0.5 rounded bg-[#27272a]">
                          {past.submittedHours} hrs
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            past.cockpitStatus === 'pre_approved'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                              : past.cockpitStatus === 'rejected'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                              : 'bg-[#27272a] text-[#a1a1aa]'
                          }`}
                        >
                          {past.cockpitStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <ExpandableDescription text={past.description} />

                    <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]/60">
                      <span className="text-[10px] uppercase text-[#71717a] font-semibold">Links:</span>
                      {past.codeUrl && (
                        <a
                          href={past.codeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#27272a] text-[#d4d4d8] hover:text-brand-orange transition-colors inline-flex items-center gap-1"
                        >
                          <span>Repo</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {past.playableUrl && (
                        <a
                          href={past.playableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#27272a] text-[#d4d4d8] hover:text-brand-orange transition-colors inline-flex items-center gap-1"
                        >
                          <span>Demo</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          {renderActionControls('bottom')}
        </>
      )}
    </div>
  );
};
