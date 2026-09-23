import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  FolderCheck,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { fetchHackatimeData } from '../../lib/api';
import { CockpitProject, HackatimeProjectStats } from '../../lib/types';

interface HackatimeSanityStageProps {
  project: CockpitProject;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string) => void;
}

export const HackatimeSanityStage: React.FC<HackatimeSanityStageProps> = ({
  project,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const [stats, setStats] = useState<Partial<HackatimeProjectStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    if (project.hackatimeId) {
      fetchHackatimeData(project.hackatimeId)
        .then((res) => {
          if (mounted) {
            setStats(res);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setStats({ error: 'Hackatime API unreachable' });
            setIsLoading(false);
          }
        });
    } else {
      setStats({ error: 'No Hackatime ID provided in submission' });
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [project.hackatimeId]);

  // Project match detection
  const selectedProjName = (project.hackatimeProjects || '').trim();
  const availableProjects = stats?.projects || [];
  const hasSelectedProject = selectedProjName.length > 0;

  const isExactProjectMatched = hasSelectedProject && availableProjects.some(
    (p) => p.toLowerCase() === selectedProjName.toLowerCase()
  );

  const isFuzzyProjectMatched =
    !isExactProjectMatched &&
    availableProjects.some((p) => {
      const pNorm = p.toLowerCase().replace(/[-_\s]/g, '');
      const projNorm = (selectedProjName || project.projectName).toLowerCase().replace(/[-_\s]/g, '');
      return pNorm.includes(projNorm) || projNorm.includes(pNorm);
    });

  const isHighClaimedHours = project.submittedHours > 24;

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
              Stage 0 of 5
            </span>
            <span className="text-xs text-content-tertiary">Verification Workflow</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Hackatime Telemetry & Project Verification
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Confirm that heartbeats exist for the selected Hackatime project, verify that the project name aligns with the repository, and evaluate velocity consistency.
          </p>
        </div>

        {project.hackatimeId && (
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
              title="Open raw user stats JSON"
            >
              <span>Raw Stats JSON</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Querying public Hackatime telemetry for user @{project.hackatimeId}...</span>
        </div>
      ) : (
        <>
          {/* Notice for unusually high velocity without alarmist emojis */}
          {isHighClaimedHours && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed flex-1">
                <span className="font-semibold block text-amber-950">
                  High Single-Submission Claim ({project.submittedHours} hrs)
                </span>
                <span>
                  Claims over 24 hours require thorough inspection of the commit log and git diffs in later stages to confirm sustained manual engineering.
                </span>
              </div>
            </div>
          )}

          {/* Project & Hours Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Selected Project Match */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-blue-600" />
                  Hackatime Project
                </span>
              </div>
              <div className="text-base font-bold font-mono text-content-primary truncate">
                {project.hackatimeProjects || 'None specified'}
              </div>
              <div className="pt-1">
                {isExactProjectMatched ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-semantic-success bg-semantic-successBg px-2 py-0.5 rounded border border-semantic-successBorder">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed in Account Projects
                  </span>
                ) : isFuzzyProjectMatched ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <CheckCircle2 className="w-3 h-3" /> Approximate Name Match
                  </span>
                ) : availableProjects.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-content-secondary bg-canvas-subtle px-2 py-0.5 rounded border border-border-subtle">
                    <HelpCircle className="w-3 h-3" /> Not Found in {availableProjects.length} Projects
                  </span>
                ) : (
                  <span className="text-[11px] text-content-muted">
                    No active projects list returned
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Claimed Project Hours */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                Claimed Project Hours
              </span>
              <div className="text-2xl font-bold font-mono text-content-primary">
                {project.submittedHours} hrs
              </div>
              <p className="text-[11px] text-content-tertiary">
                Requested on submission for {project.projectName}
              </p>
            </div>

            {/* Card 3: Lifetime Account Hours (with clarifying explanation) */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-content-secondary" />
                Account Lifetime Total
              </span>
              <div className="text-2xl font-bold font-mono text-content-secondary">
                {stats?.totalHoursReadable || '—'}
              </div>
              <p className="text-[11px] text-content-tertiary">
                Total editor telemetry across all projects on @{project.hackatimeId || 'user'}
              </p>
            </div>
          </div>

          {/* Languages Distribution */}
          <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-2">
              <Code2 className="w-4 h-4 text-brand-orange" />
              Editor Telemetry Language Distribution
            </h3>

            {stats?.languages && stats.languages.length > 0 ? (
              <div className="space-y-3">
                <div className="h-2.5 rounded-full bg-canvas-subtle overflow-hidden flex border border-border-subtle">
                  {stats.languages.slice(0, 6).map((lang, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${Math.max(lang.percent, 2)}%`,
                        backgroundColor: lang.color || '#ec3750',
                      }}
                      title={`${lang.name}: ${lang.percent.toFixed(1)}%`}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {stats.languages.slice(0, 8).map((lang, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-canvas-subtle border border-border-subtle text-xs text-content-primary"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: lang.color || '#ec3750' }}
                      />
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[11px] text-content-tertiary font-mono">
                        {lang.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-content-tertiary py-2">
                No language telemetry recorded for this Hackatime user handle.
              </p>
            )}
          </div>

          {/* Verification Checklist */}
          <div className="p-5 rounded-xl bg-canvas-card border border-border-subtle space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
              Reviewer Compliance Checks
            </h3>
            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage0_heartbeats_verified'])}
                  onChange={() => handleCheckbox('stage0_heartbeats_verified')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Hackatime account has active heartbeats and editor activity recorded
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage0_project_aligned'])}
                  onChange={() => handleCheckbox('stage0_project_aligned')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Tracked project name corresponds to repository and code changes
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none p-2 rounded-lg hover:bg-canvas-hover transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(reviewChecklist['stage0_velocity_plausible'])}
                  onChange={() => handleCheckbox('stage0_velocity_plausible')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Claimed hours are within plausible human limits and not an idle script
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
                  placeholder="Reason for telemetry concern..."
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-content-primary flex-1 focus:outline-none focus:border-brand-orange"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (onEarlyExit && flagNote.trim()) {
                      onEarlyExit(`Telemetry Concern: ${flagNote.trim()}`);
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
                <span>Flag Telemetry Concern</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Continue to Double-Dip Check →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
