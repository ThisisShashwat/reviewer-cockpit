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
} from 'lucide-react';
import { fetchHalceonProfile, fetchManifestLookup } from '../../lib/api';
import {
  CockpitProject,
  HalceonProfileData,
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

const ExpandableDescription: React.FC<{ text: string; maxLen?: number }> = ({
  text,
  maxLen = 140,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!text) return <span className="text-[#71717a] italic">No description provided</span>;
  if (text.length <= maxLen) return <span className="text-[#d4d4d8] leading-relaxed">{text}</span>;

  return (
    <div className="space-y-1">
      <p className="text-[#d4d4d8] leading-relaxed whitespace-pre-wrap">
        {expanded ? text : `${text.slice(0, maxLen)}...`}
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

  const priorApprovedHours = matchingHalceonShip ? matchingHalceonShip.hours : 0;
  const isDoubleDipDetected = Boolean(matchingHalceonShip);
  const netDeltaHours = Math.max(
    0,
    Math.round((project.submittedHours - priorApprovedHours) * 10) / 10
  );

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
          className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
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
          {/* Automated Detection Checks Banner at Top */}
          {isDoubleDipDetected && matchingHalceonShip ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-3 shadow-lg">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs flex-1">
                  <span className="font-bold text-sm block text-amber-300">
                    Automated Alert: Repository Previously Shipped in {matchingHalceonShip.program} ({matchingHalceonShip.hours} hrs)
                  </span>
                  <p className="mt-1 text-amber-200/90 leading-relaxed">
                    This exact repository was already approved in {matchingHalceonShip.program} on {matchingHalceonShip.approvedAt}.
                    Under Hack Club guidelines, double-dipping without verifiable new features is prohibited.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#121214] border border-[#27272a] flex items-center justify-between text-xs font-mono">
                <span className="text-[#a1a1aa]">Calculated Net Delta Hours:</span>
                <span className="text-sm font-bold text-amber-400">
                  {netDeltaHours} hrs (Claimed {project.submittedHours}h - Prior {priorApprovedHours}h)
                </span>
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

          {/* Section 1: Halceon Unified Ships (Card-based, zero horizontal scrolling) */}
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
                {halceonShips.map((ship, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-colors space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase bg-brand-orange/20 text-brand-orange border border-brand-orange/30">
                          {ship.program}
                        </span>
                        <span className="font-mono font-bold text-white text-xs truncate">
                          {ship.repo}
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

                    {ship.links && ship.links.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]/60">
                        <span className="text-[10px] uppercase text-[#71717a] font-semibold">Links:</span>
                        {ship.links.map((link, lIdx) => (
                          <a
                            key={lIdx}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#27272a] text-[#d4d4d8] hover:text-brand-orange hover:bg-[#333338] transition-colors inline-flex items-center gap-1"
                          >
                            <span>{link.includes('github.com') ? 'Repo' : 'Demo'}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
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
                          {past.projectName}
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
                label="Halceon Cross-YSWS Ships Inspected"
                description={`Verified complete track record (${halceonTotalShips} prior ships in Stardance, Arcade, High Seas, Blot).`}
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
                label="No Uncredited Double-Dipping / Delta Hours Verified"
                description="Repository is confirmed original or requested hours reflect strictly new, incremental features."
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
