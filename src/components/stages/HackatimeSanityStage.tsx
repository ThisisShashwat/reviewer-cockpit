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
  const [activeLangTab, setActiveLangTab] = useState<'project' | 'lifetime'>('project');

  const selectedProjName = (project.hackatimeProjects || '').trim();
  const cleanProjectName = selectedProjName.replace(/\s*\([^)]*\)/g, '').trim();

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    if (project.hackatimeId) {
      fetchHackatimeData(project.hackatimeId, cleanProjectName)
        .then((res) => {
          if (mounted) {
            setStats(res);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setStats({
              error: 'Hackatime API unreachable',
              isProjectFound: false,
            });
            setIsLoading(false);
          }
        });
    } else {
      setStats({
        error: 'No Hackatime ID provided in submission',
        isProjectFound: false,
      });
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [project.hackatimeId, cleanProjectName]);

  const availableProjects = stats?.projects || [];
  const isHighClaimedHours = project.submittedHours > 24;

  const handleCheckbox = (key: string) => {
    if (onToggleChecklist) {
      onToggleChecklist(key);
    }
  };

  const projectLanguages = stats?.languages || [];
  const lifetimeLanguages = stats?.lifetimeLanguages || [];
  const activeLanguages = activeLangTab === 'project' && projectLanguages.length > 0
    ? projectLanguages
    : lifetimeLanguages;

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 0 of 5
            </span>
            <span className="text-xs text-content-tertiary">Telemetry Verification</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Project-Specific Hackatime Telemetry
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Filtered specifically for project <strong className="text-content-primary font-mono">{cleanProjectName || project.projectName}</strong> against Hackatime heartbeats.
          </p>
        </div>

        {project.hackatimeId && (
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats?filter_by_project=${encodeURIComponent(cleanProjectName)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
              title="Open raw filtered Hackatime JSON"
            >
              <span>Project Stats JSON</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Querying project telemetry for {cleanProjectName || project.projectName} (User #{project.hackatimeId})...</span>
        </div>
      ) : (
        <>
          {/* Notice for high hours */}
          {isHighClaimedHours && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed flex-1">
                <span className="font-semibold block text-amber-950">
                  High Submission Window ({project.submittedHours} hrs)
                </span>
                <span>
                  Claims over 24 hours require careful validation of commit logs and git diffs in later stages to ensure sustained active engineering.
                </span>
              </div>
            </div>
          )}

          {/* Metric Comparison Strip: Project-Specific vs Claimed vs Lifetime */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tracked Project & Alignment */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <FolderCheck className="w-3.5 h-3.5 text-blue-600" />
                Tracked Project Name
              </span>
              <div className="text-base font-bold font-mono text-content-primary truncate">
                {cleanProjectName || 'None specified'}
              </div>
              <div className="pt-1">
                {stats?.isProjectFound ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-semantic-success bg-semantic-successBg px-2 py-0.5 rounded border border-semantic-successBorder">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed in User&apos;s Projects
                  </span>
                ) : availableProjects.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <HelpCircle className="w-3 h-3" /> Not in {availableProjects.length} Known Projects
                  </span>
                ) : (
                  <span className="text-[11px] text-content-muted">
                    No project list returned
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Hours Tracked on THIS Project */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                Tracked on This Project
              </span>
              <div className="text-2xl font-bold font-mono text-content-primary">
                {stats?.projectHoursReadable || (stats?.projectSeconds ? `${(stats.projectSeconds / 3600).toFixed(1)}h` : '0h')}
              </div>
              <p className="text-[11px] text-content-tertiary">
                Claimed on submission: <strong className="text-content-primary font-mono">{project.submittedHours} hrs</strong>
              </p>
            </div>

            {/* Card 3: Account Lifetime (Context Only) */}
            <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-content-secondary" />
                Lifetime Across All Projects
              </span>
              <div className="text-2xl font-bold font-mono text-content-secondary">
                {stats?.totalHoursReadable || '—'}
              </div>
              <p className="text-[11px] text-content-tertiary">
                Total account editor history across all programs
              </p>
            </div>
          </div>

          {/* Sleek Dark Telemetry Card: Language Distribution (The dark card aesthetic the user specifically praised!) */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-orange-400" />
                <span>Editor Telemetry & Language Breakdown</span>
              </h3>

              {/* View Toggle: Project vs Lifetime */}
              <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('project')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeLangTab === 'project'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  This Project ({cleanProjectName || 'Active'})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('lifetime')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    activeLangTab === 'lifetime'
                      ? 'bg-neutral-800 text-white shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Account Lifetime
                </button>
              </div>
            </div>

            {activeLanguages.length > 0 ? (
              <div className="space-y-3">
                {/* Visual vibrant language bar */}
                <div className="h-3 rounded-full bg-neutral-800 overflow-hidden flex border border-neutral-700/60 shadow-inner">
                  {activeLanguages.slice(0, 8).map((lang, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${Math.max(lang.percent, 3)}%`,
                        backgroundColor: lang.color || '#ff6b35',
                      }}
                      title={`${lang.name}: ${lang.percent.toFixed(1)}% (${lang.text})`}
                    />
                  ))}
                </div>

                {/* Language Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeLanguages.slice(0, 10).map((lang, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 shadow-sm"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: lang.color || '#ff6b35' }}
                      />
                      <span className="font-semibold text-white">{lang.name}</span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {lang.percent.toFixed(1)}% ({lang.text})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-neutral-400 bg-neutral-900/60 rounded-xl border border-neutral-800">
                No language telemetry recorded for {cleanProjectName || 'this project'}.
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
                  checked={Boolean(reviewChecklist['stage0_heartbeats_verified'])}
                  onChange={() => handleCheckbox('stage0_heartbeats_verified')}
                  className="rounded border-border text-brand-orange focus:ring-brand-orange w-4 h-4"
                />
                <span className="text-content-secondary font-medium">
                  Hackatime heartbeats exist and were logged during the project development window
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
                  Project name <strong className="font-mono text-content-primary">{cleanProjectName}</strong> aligns with repository code
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
                  Tracked hours ({stats?.projectHoursReadable || `${project.submittedHours}h`}) are plausible and not an idle script
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
              <span>Continue to Past Submissions & Double-Dip →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
