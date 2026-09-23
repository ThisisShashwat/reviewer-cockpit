import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  History,
  RefreshCw,
  Search,
  Ship,
} from 'lucide-react';
import { fetchHalceonProfile, fetchManifestLookup } from '../../lib/api';
import {
  CockpitProject,
  HalceonProfileData,
  ManifestLookupData,
} from '../../lib/types';

interface ManifestDoubleDipStageProps {
  project: CockpitProject;
  allProjects?: CockpitProject[];
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  onApplyDeltaHours?: (hours: number, justification: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

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

  const priorApprovedHours = matchingHalceonShip ? matchingHalceonShip.hours : 0;
  const isDoubleDipDetected = Boolean(matchingHalceonShip);
  const netDeltaHours = Math.max(
    0,
    Math.round((project.submittedHours - priorApprovedHours) * 10) / 10
  );

  const handleCheckbox = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 1 of 5
            </span>
            <span className="text-xs text-content-tertiary">Cross-Program Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Consolidated Past Submissions (Live & Halceon Unified)
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit submitter @<strong className="text-content-primary">{project.githubUsername}</strong> across all Hack Club programs (Stardance, Arcade, High Seas, Blot, Horizons) directly inline.
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
          {/* Double-Dip Warning Banner if repository was previously shipped */}
          {isDoubleDipDetected && matchingHalceonShip && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs flex-1">
                  <span className="font-semibold block text-amber-950">
                    Repository Previously Shipped in {matchingHalceonShip.program} ({matchingHalceonShip.hours} hrs)
                  </span>
                  <p className="mt-0.5 text-amber-800">
                    This repository was already approved in {matchingHalceonShip.program} on {matchingHalceonShip.approvedAt}.
                    Only verifiable NEW work and incremental features can be granted hours.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-100/70 border border-amber-300 flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-amber-950">Suggested Net Delta Hours:</span>
                <span className="text-sm font-bold text-amber-950">
                  {netDeltaHours} hrs (Claimed {project.submittedHours}h - Prior {priorApprovedHours}h)
                </span>
              </div>
            </div>
          )}

          {/* Section 1: Halceon Cross-YSWS Ships (Rendered directly inline as user demanded!) */}
          <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                <Ship className="w-4 h-4 text-brand-orange" />
                Halceon Unified Submissions ({halceonTotalShips} ships across programs)
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-canvas-subtle border border-border-subtle text-content-secondary">
                {halceonTotalHours} hrs shipped total
              </span>
            </div>

            {halceonShips.length === 0 ? (
              <div className="py-4 text-xs text-content-tertiary bg-canvas-subtle p-3 rounded-lg border border-border-subtle">
                No past ships found in the Halceon Unified database for @{project.githubUsername}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border-subtle rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-canvas-subtle text-content-tertiary uppercase font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Program</th>
                      <th className="py-2.5 px-3">Repository</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Hours</th>
                      <th className="py-2.5 px-3">Approved Date</th>
                      <th className="py-2.5 px-3 text-right">Links</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {halceonShips.map((ship, idx) => (
                      <tr key={idx} className="hover:bg-canvas-hover transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                            {ship.program}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-content-primary">
                          {ship.repo}
                        </td>
                        <td className="py-2.5 px-3 text-content-secondary max-w-xs truncate">
                          {ship.description || 'No description'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-content-primary">
                          {ship.hours} hrs
                        </td>
                        <td className="py-2.5 px-3 text-content-tertiary font-mono">
                          {ship.approvedAt || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {ship.links.slice(0, 2).map((link, lIdx) => (
                              <a
                                key={lIdx}
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-canvas-subtle border border-border-subtle text-content-secondary hover:text-brand-orange transition-colors"
                              >
                                {link.includes('github.com') ? 'Repo' : 'Demo'}
                              </a>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Hack Club Live Database Submissions */}
          <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
                <History className="w-4 h-4 text-brand-orange" />
                Hack Club Live Submissions History ({userPastLiveSubmissions.length} other in Live)
              </h3>
              <span className="text-xs text-content-tertiary font-mono">
                @{project.githubUsername}
              </span>
            </div>

            {userPastLiveSubmissions.length === 0 ? (
              <div className="py-4 text-xs text-content-tertiary bg-canvas-subtle p-3 rounded-lg border border-border-subtle">
                No other submissions in Hack Club Live for this user. This is their only Live submission.
              </div>
            ) : (
              <div className="overflow-x-auto border border-border-subtle rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-canvas-subtle text-content-tertiary uppercase font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Project</th>
                      <th className="py-2.5 px-3">Track</th>
                      <th className="py-2.5 px-3">Hours</th>
                      <th className="py-2.5 px-3">Submitted</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Repository</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {userPastLiveSubmissions.map((past) => (
                      <tr key={past.id} className="hover:bg-canvas-hover transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-content-primary">
                          {past.projectName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-canvas-subtle border border-border-subtle text-content-secondary">
                            {past.projectType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-content-primary">
                          {past.submittedHours} hrs
                        </td>
                        <td className="py-2.5 px-3 text-content-tertiary">
                          {new Date(past.submittedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              past.cockpitStatus === 'pre_approved'
                                ? 'bg-semantic-successBg text-semantic-success border border-semantic-successBorder'
                                : past.cockpitStatus === 'rejected'
                                ? 'bg-semantic-dangerBg text-semantic-danger border border-semantic-dangerBorder'
                                : 'bg-canvas-subtle text-content-secondary border border-border-subtle'
                            }`}
                          >
                            {past.cockpitStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <a
                            href={past.codeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-orange hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>Repo</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reviewer Compliance Checks */}
          <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
              Reviewer Compliance Checks
            </h3>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage1_halceon_reviewed'])}
                  onChange={() => handleCheckbox('stage1_halceon_reviewed')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Submitter&apos;s Halceon Unified past ships have been inspected ({halceonTotalShips} ships found)
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage1_live_reviewed'])}
                  onChange={() => handleCheckbox('stage1_live_reviewed')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Submitter&apos;s prior Live submission records have been verified
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage1_double_dip_checked'])}
                  onChange={() => handleCheckbox('stage1_double_dip_checked')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Repository is confirmed original or delta hours applied if previously rewarded
                </span>
              </label>
            </div>
          </div>

          {/* Reviewer Action Bar */}
          <div className="pt-4 flex items-center justify-between border-t border-border-subtle">
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
                  className="px-3 py-1.5 rounded-lg bg-semantic-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors shrink-0"
                >
                  Confirm Flag
                </button>
                <button
                  type="button"
                  onClick={() => setIsFlagging(false)}
                  className="px-2.5 py-1.5 text-xs text-content-tertiary hover:text-content-primary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsFlagging(true)}
                className="px-3.5 py-2 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-semantic-danger hover:border-semantic-dangerBorder transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Flag Potential Double-Dip</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Continue to Deliverable & README →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
