import React, { useEffect, useState } from 'react';
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
import { fetchHalceonProfile, fetchManifestLookup } from '../../lib/api';
import {
  CockpitProject,
  HalceonProfileData,
  HalceonShipLink,
  ManifestLookupData,
} from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface ManifestDoubleDipStageProps {
  project: CockpitProject;
  allProjects?: CockpitProject[];
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  onApplyDeltaHours?: (hours: number, justification: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
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

export const ManifestDoubleDipStage: React.FC<ManifestDoubleDipStageProps> = ({
  project,
  allProjects = [],
  onAdvance,
  onEarlyExit,
  onApplyDeltaHours: _onApplyDeltaHours,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [_manifestData, setManifestData] = useState<ManifestLookupData | null>(null);
  const [halceonData, setHalceonData] = useState<HalceonProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.all([
      fetchManifestLookup(project.codeUrl, project.githubUsername),
      fetchHalceonProfile(project.githubUsername),
    ])
      .then(([manRes, halRes]) => {
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
  }, [project.codeUrl, project.githubUsername]);

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

  // Find archive link for matching ship if any
  const priorArchiveLink = matchingHalceonShip?.parsedLinks?.find((l) => l.isArchive) ||
    (matchingHalceonShip?.links || []).find((l) => l.includes('archive.hackclub.com') || l.includes('archive.org'));

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

  const handlePass = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, true);
    }
  };

  const handleFail = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key, false);
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

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 1 of 6
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

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Fetching submitter&apos;s complete ship history from Halceon Unified database...</span>
        </div>
      ) : (
        <>
          {/* Critical Double-Dip Alert & Archive Comparison Panel */}
          {isDoubleDipDetected && matchingHalceonShip ? (
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 space-y-4 shadow-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs flex-1 space-y-1">
                  <span className="font-bold text-sm block text-amber-300">
                    CRITICAL DOUBLE-DIP AUDIT: Repository Previously Approved in {matchingHalceonShip.program} ({matchingHalceonShip.hours}h)
                  </span>
                  <p className="text-amber-200/90 leading-relaxed">
                    This exact repository was already approved on <strong>{matchingHalceonShip.approvedAt}</strong>.
                    <strong> DO NOT simply subtract prior hours ({matchingHalceonShip.hours}h) from requested hours ({project.submittedHours}h).</strong> The prior hours may be deflated, or the submitter may have resubmitted the exact same code with no new progress.
                  </p>
                </div>
              </div>

              {/* Archive & Codebase Progression Comparison Box */}
              <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] space-y-3 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-[#a1a1aa] flex items-center gap-2">
                    <Archive className="w-4 h-4 text-purple-400" />
                    <span>Prior Approved Archive Snapshot:</span>
                  </span>
                  {priorArchiveLink ? (
                    <a
                      href={typeof priorArchiveLink === 'string' ? priorArchiveLink : priorArchiveLink.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 rounded-lg bg-purple-950/60 text-purple-300 border border-purple-500/40 hover:bg-purple-900/60 transition-colors inline-flex items-center gap-1.5 font-bold"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Download Prior Archive Snapshot</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-amber-400/80 italic font-sans text-[11px]">
                      Archive not preserved on record
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between font-mono pt-2 border-t border-[#27272a]">
                  <span className="text-[#a1a1aa] flex items-center gap-2">
                    <GitCommit className="w-4 h-4 text-brand-orange" />
                    <span>Current Repository Commits:</span>
                  </span>
                  <a
                    href={`${project.codeUrl}/commits`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-[#27272a] text-white hover:text-brand-orange transition-colors inline-flex items-center gap-1.5 font-bold"
                  >
                    <span>Inspect Commits Since {matchingHalceonShip.approvedAt}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-[#a1a1aa] leading-relaxed pt-1">
                  Rule: Compare the archived codebase snapshot against current code. If the code is identical or represents minor tweaks, grant <strong>0 new hours</strong>. If genuine new features were completed after {matchingHalceonShip.approvedAt}, grant only the hours corresponding to the new features.
                </p>
              </div>
            </div>
          ) : similarHalceonShip || similarLiveSubmission ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-2.5 text-xs shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block">
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

          {/* Interactive Reviewer Pass/Fail Checklist */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Stage 1 Verification: Double-Dip & History Checks
              </h3>
              <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
            </div>

            <div className="space-y-2.5">
              <PassFailControl
                label="Halceon Cross-YSWS Ships & Archives Inspected"
                description={`Verified complete track record (${halceonTotalShips} prior ships in Stardance, Arcade, High Seas, Blot) and checked archive presence.`}
                status={reviewChecklist['stage1_halceon_reviewed']}
                onPass={() => handlePass('stage1_halceon_reviewed')}
                onFail={() => handleFail('stage1_halceon_reviewed')}
              />

              <PassFailControl
                label="Live Submissions History Audited"
                description="Verified past submissions in Hack Club Live for this user."
                status={reviewChecklist['stage1_live_reviewed']}
                onPass={() => handlePass('stage1_live_reviewed')}
                onFail={() => handleFail('stage1_live_reviewed')}
              />

              <PassFailControl
                label="Archive vs Code Progression Verified (No Unchanged Resubmissions)"
                description="Verified genuine new progress and features were created beyond previous archived snapshot (no naive hours subtraction)."
                status={reviewChecklist['stage1_double_dip_checked']}
                onPass={() => handlePass('stage1_double_dip_checked')}
                onFail={() => handleFail('stage1_double_dip_checked')}
              />
            </div>
          </div>

          {/* Reviewer Action Bar */}
          <div className="pt-4 flex items-center justify-between border-t border-border-subtle shrink-0">
            {isFlagging ? (
              <div className="flex items-center gap-2 flex-1 max-w-md mr-4">
                <input
                  type="text"
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  placeholder="Reason for double-dip concern..."
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onEarlyExit && flagNote.trim()) {
                      onEarlyExit(`Double-Dip Concern: ${flagNote.trim()}`);
                    }
                    setIsFlagging(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
                >
                  Confirm Flag
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlagging(false)}
                  className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsFlagging(true)}
                className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Flag Potential Double-Dip</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue to Sahil&apos;s Introspect →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
