import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  History,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { fetchManifestLookup } from '../../lib/api';
import { CockpitProject, ManifestLookupData } from '../../lib/types';

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
  const [data, setData] = useState<ManifestLookupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    fetchManifestLookup(project.codeUrl, project.githubUsername)
      .then((res) => {
        if (mounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setData({
            isLoading: false,
            isRegistered: false,
            otherSubmissions: [],
            halceonUrl: `https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(project.githubUsername)}`,
            error: 'Manifest lookup unreachable',
          });
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [project.codeUrl, project.githubUsername]);

  // Consolidate past submissions by this submitter from the local database
  const userPastSubmissions = allProjects.filter((p) => {
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

  // Calculate prior approved hours across other YSWS
  const priorApprovedHours =
    data?.otherSubmissions?.reduce(
      (sum, s) =>
        s.shipStatus.toLowerCase() === 'approved' && s.hoursShipped
          ? sum + s.hoursShipped
          : sum,
      0
    ) ?? 0;

  const isDoubleDipDetected = (data?.isRegistered && data.otherSubmissions.length > 0) || false;
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
            <span className="text-xs text-content-tertiary">Anti-Double-Dipping Audit</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Consolidated Past Submissions & Manifest Check
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Compare this project against the submitter&apos;s prior Live submissions and query the Hack Club Manifest database to ensure hours are not being double-claimed across YSWS programs.
          </p>
        </div>

        <a
          href={
            data?.halceonUrl ||
            `https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(
              project.githubUsername
            )}`
          }
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Halceon Profile</span>
          <ExternalLink className="w-3 h-3 text-content-muted" />
        </a>
      </div>

      {/* Section 1: Submitter's Track Record in Live */}
      <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
            <History className="w-4 h-4 text-brand-orange" />
            Submitter&apos;s Live Submissions Track Record ({userPastSubmissions.length} prior)
          </h3>
          <span className="text-xs text-content-tertiary font-mono">
            @{project.githubUsername || 'anonymous'}
          </span>
        </div>

        {userPastSubmissions.length === 0 ? (
          <div className="py-4 text-xs text-content-tertiary bg-canvas-subtle p-3 rounded-lg border border-border-subtle">
            No other submissions recorded for this user in the Hack Club Live database. This is their only submission.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle text-content-tertiary uppercase font-semibold">
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-3">Track</th>
                  <th className="py-2 px-3">Hours</th>
                  <th className="py-2 px-3">Submitted</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Code Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {userPastSubmissions.map((past) => (
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

      {/* Section 2: Manifest Cross-YSWS Lookup */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-content-tertiary text-xs bg-canvas-card border border-border-subtle rounded-xl">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-orange" />
          <span>Querying Manifest cross-YSWS registry...</span>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-orange" />
              Manifest Cross-YSWS Database Lookup
            </h3>
            {isDoubleDipDetected ? (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Prior Cross-Program Submissions Found
              </span>
            ) : (
              <span className="text-xs font-semibold text-semantic-success bg-semantic-successBg px-2.5 py-1 rounded-full border border-semantic-successBorder flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero Cross-Program Duplicates
              </span>
            )}
          </div>

          {!isDoubleDipDetected ? (
            <p className="text-xs text-content-tertiary">
              This repository has not been previously logged in Hack Club Manifest for High Seas, Arcade, Blot, or other YSWS programs.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                This repository was previously submitted to {data?.otherSubmissions?.length || 0} other program(s).
                If hours were approved previously, only the delta of verifiable new development can be approved.
              </div>

              {/* Submissions list */}
              <div className="space-y-2">
                {(data?.otherSubmissions || []).map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-canvas-subtle border border-border-subtle text-xs"
                  >
                    <div>
                      <span className="font-semibold text-content-primary">{sub.yswsName}</span>
                      <span className="text-content-tertiary ml-2">
                        Status: <strong className="text-content-secondary">{sub.shipStatus}</strong>
                      </span>
                    </div>
                    <span className="font-mono font-medium text-content-secondary">
                      {sub.hoursShipped ? `${sub.hoursShipped} hrs shipped` : 'Hours unrecorded'}
                    </span>
                  </div>
                ))}
              </div>

              {priorApprovedHours > 0 && (
                <div className="p-3.5 rounded-lg bg-canvas-subtle border border-border-subtle flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-orange" />
                    <span className="font-semibold text-content-primary">
                      Suggested Net Delta Hours:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-sm text-brand-orange">
                    {netDeltaHours} hrs (Claimed {project.submittedHours}h - Prior {priorApprovedHours}h)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Reviewer Compliance Checks */}
      <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
          Reviewer Compliance Checks
        </h3>
        <div className="space-y-2 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage1_past_submissions_reviewed'])}
              onChange={() => handleCheckbox('stage1_past_submissions_reviewed')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Submitter&apos;s prior Live submission history has been reviewed
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage1_manifest_clean'])}
              onChange={() => handleCheckbox('stage1_manifest_clean')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              Repository is confirmed original and not double-dipped across YSWS programs
            </span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
            <input
              type="checkbox"
              checked={Boolean(reviewChecklist['stage1_delta_confirmed'])}
              onChange={() => handleCheckbox('stage1_delta_confirmed')}
              className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
            />
            <span className="text-content-secondary font-medium">
              If previously submitted, only the delta of new features and hours is evaluated
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
          <span>Continue to Live Deliverables →</span>
        </button>
      </div>
    </div>
  );
};
