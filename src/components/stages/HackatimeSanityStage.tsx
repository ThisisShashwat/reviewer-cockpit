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
  Lock,
  Bot,
  Undo2,
} from 'lucide-react';
import { fetchHackatimeData } from '../../lib/api';
import { CockpitProject, HackatimeProjectStats } from '../../lib/types';
import { PassFailControl } from '../common/PassFailControl';

interface HackatimeSanityStageProps {
  project: CockpitProject;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, boolean>;
  onToggleChecklist?: (key: string, status?: boolean) => void;
}

export const HackatimeSanityStage: React.FC<HackatimeSanityStageProps> = ({
  project,
  onAdvance,
  onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const selectedProjName = (project.hackatimeProjects || '').trim();
  const initialCleanName = selectedProjName.replace(/\s*\([^)]*\)/g, '').trim() || project.projectName;

  const [activeProjectName, setActiveProjectName] = useState(initialCleanName);
  const [stats, setStats] = useState<Partial<HackatimeProjectStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flagNote, setFlagNote] = useState('');
  const [isFlagging, setIsFlagging] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<'project' | 'lifetime'>('project');

  useEffect(() => {
    setActiveProjectName(initialCleanName);
  }, [project.id, initialCleanName]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    if (project.hackatimeId) {
      fetchHackatimeData(project.hackatimeId, activeProjectName)
        .then((res) => {
          if (mounted) {
            setStats(res);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setStats({
              error: 'Hackatime API unreachable or profile is private',
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
  }, [project.hackatimeId, activeProjectName]);

  const availableProjects = stats?.projects || [];
  const isHighClaimedHours = project.submittedHours > 24;

  const projectLanguages = stats?.languages || [];
  const lifetimeLanguages = stats?.lifetimeLanguages || [];
  const activeLanguages =
    activeLangTab === 'project' && projectLanguages.length > 0
      ? projectLanguages
      : lifetimeLanguages;

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

  const isPrivateOrEmpty = !isLoading && project.hackatimeId && availableProjects.length === 0;

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 1 of 7
            </span>
            <span className="text-xs text-content-tertiary">Telemetry Verification</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Project-Specific Editor Telemetry
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit coding hours and languages filtered strictly for <strong className="text-content-primary font-mono">{activeProjectName}</strong> via public Hackatime telemetry.
          </p>
        </div>

        {project.hackatimeId && (
          <a
            href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats?filter_by_project=${encodeURIComponent(activeProjectName)}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-brand-orange" />
            <span>Raw Hackatime API</span>
            <ExternalLink className="w-3 h-3 text-content-muted" />
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-content-tertiary text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-orange" />
          <span>Fetching project-specific telemetry from Hackatime API...</span>
        </div>
      ) : (
        <>
          {/* Missing Telemetry / Private Account Diagnostic Banner */}
          {isPrivateOrEmpty && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2 text-xs shadow-lg">
              <div className="flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-300 block">
                    Telemetry Unavailable: Account May Be Private or Heartbeats Not Recorded
                  </span>
                  <p className="text-amber-200/90 leading-relaxed">
                    Hackatime returned 0 projects for user ID <strong>{project.hackatimeId}</strong>.
                    <br />• <strong>Private Account Setting:</strong> By default heartbeats are public, but the user may have configured their account as private.
                    <br />• <strong>Token / Editor Disconnect:</strong> The editor extension may not have synced heartbeats during the build window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* High Hours Velocity Warning Banner */}
          {isHighClaimedHours && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 flex items-start gap-2.5 text-xs shadow-lg">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block">
                  High Claim Velocity Notice: {project.submittedHours} Hours Claimed
                </span>
                <span className="text-amber-200/90 mt-0.5 block leading-relaxed">
                  Claims over 24 hours require careful validation of commit logs and git diffs in later stages to ensure sustained active engineering.
                </span>
              </div>
            </div>
          )}

          {/* Interactive Renamed Project Switcher (When project name differs from local folder name) */}
          {availableProjects.length > 0 && !stats?.isProjectFound && (
            <div className="p-4 rounded-xl bg-[#18181b] border border-amber-500/30 text-white space-y-2 text-xs shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  &ldquo;{activeProjectName}&rdquo; not matched in user&apos;s {availableProjects.length} tracked projects (folder may be renamed)
                </span>
                <span className="text-[#a1a1aa] text-[11px]">Click an alternative project to re-filter:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {availableProjects.map((pName) => (
                  <button
                    key={pName}
                    type="button"
                    onClick={() => setActiveProjectName(pName)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer ${
                      activeProjectName.toLowerCase() === pName.toLowerCase()
                        ? 'bg-brand-orange text-white font-bold'
                        : 'bg-[#27272a] text-[#d4d4d8] hover:bg-[#3f3f46]'
                    }`}
                  >
                    {pName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metric Comparison Strip: Project-Specific vs Claimed vs Lifetime (Dark Console Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tracked Project & Alignment */}
            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-2 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <FolderCheck className="w-3.5 h-3.5 text-blue-400" />
                  Tracked Project Name
                </span>
                {activeProjectName.toLowerCase() !== initialCleanName.toLowerCase() && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    MANUAL OVERRIDE
                  </span>
                )}
              </div>
              <div className="text-base font-bold font-mono text-white truncate">
                {activeProjectName || 'None specified'}
              </div>
              {activeProjectName.toLowerCase() !== initialCleanName.toLowerCase() && (
                <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-0.5">
                  <span className="truncate">Submitted: <strong className="text-zinc-300 font-mono">{initialCleanName}</strong></span>
                  <button
                    type="button"
                    onClick={() => setActiveProjectName(initialCleanName)}
                    className="text-brand-orange hover:underline text-[10px] font-semibold ml-2 shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Undo2 className="w-3 h-3" /> Reset
                  </button>
                </div>
              )}
              <div className="pt-1">
                {stats?.isProjectFound ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed in User&apos;s Projects
                  </span>
                ) : availableProjects.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <HelpCircle className="w-3 h-3" /> Not in {availableProjects.length} Known Projects
                  </span>
                ) : (
                  <span className="text-[11px] text-[#71717a]">
                    No project list returned (Profile private)
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Hours Tracked on THIS Project */}
            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-2 shadow-lg">
              <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                Tracked on This Project
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400">
                {stats?.projectHoursReadable || (stats?.projectSeconds ? `${(stats.projectSeconds / 3600).toFixed(1)}h` : '0h')}
              </div>
              <p className="text-[11px] text-[#a1a1aa]">
                Claimed on submission: <strong className="text-white font-mono">{project.submittedHours} hrs</strong>
              </p>
            </div>

            {/* Card 3: Account Lifetime (Context Only) */}
            <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white space-y-2 shadow-lg">
              <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#a1a1aa]" />
                Lifetime Across All Projects
              </span>
              <div className="text-2xl font-bold font-mono text-[#d4d4d8]">
                {stats?.totalHoursReadable || '—'}
              </div>
              <p className="text-[11px] text-[#71717a]">
                Total account editor history across all programs
              </p>
            </div>
          </div>

          {/* AI vs Human Coding Heartbeat Telemetry (Horizons 1/3 Mathematical Standard) */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Heartbeat Telemetry: Human vs. AI Breakdown (Horizons Telemetry Standard)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#a1a1aa] bg-[#18181b] px-2.5 py-1 rounded border border-[#27272a]">
                Categories: ai coding, browsing, meeting, communicating
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Human Coding Box */}
              <div className="p-3.5 rounded-xl bg-[#18181b] border border-emerald-500/20 text-white space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Human Coding Time
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {stats?.humanPercent ?? 100}%
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-white">
                  {stats?.humanHoursReadable || (stats?.humanSeconds ? `${(stats.humanSeconds / 3600).toFixed(1)}h` : '0h')}
                </div>
                <p className="text-[10px] text-[#a1a1aa]">Credited at 100% full hourly rate</p>
              </div>

              {/* AI Coding Box */}
              <div className="p-3.5 rounded-xl bg-[#18181b] border border-purple-500/20 text-white space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    AI & Auxiliary Heartbeats
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {stats?.aiPercent ?? 0}%
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-purple-300">
                  {stats?.aiHoursReadable || (stats?.aiSeconds ? `${(stats.aiSeconds / 3600).toFixed(1)}h` : '0h')}
                </div>
                <p className="text-[10px] text-[#a1a1aa]">Credited at 33.3% (1/3 formula)</p>
              </div>

              {/* Horizons Credited Total */}
              <div className="p-3.5 rounded-xl bg-[#18181b] border border-brand-orange/30 text-white space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-brand-orange uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-orange" />
                    Horizons Credited Total
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    1/3 Formula
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-brand-orange">
                  {stats?.horizonsApprovedHours !== undefined ? `${stats.horizonsApprovedHours}h` : '—'}
                </div>
                <p className="text-[10px] text-[#a1a1aa]">
                  Formula: Human + (AI / 3)
                </p>
              </div>
            </div>

            {/* Proportional Split Bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full overflow-hidden flex bg-[#1f1f23] border border-[#27272a]">
                <div
                  style={{ width: `${Math.max(2, stats?.humanPercent ?? 100)}%` }}
                  className="bg-emerald-500 transition-all"
                  title={`Human: ${stats?.humanPercent ?? 100}%`}
                />
                <div
                  style={{ width: `${Math.max(0, stats?.aiPercent ?? 0)}%` }}
                  className="bg-purple-500 transition-all"
                  title={`AI: ${stats?.aiPercent ?? 0}%`}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-[#a1a1aa]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Human Coding ({stats?.humanPercent ?? 100}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  AI Coding / Auxiliary ({stats?.aiPercent ?? 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Sleek Dark Telemetry Card: Language Distribution */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Editor Telemetry & Language Distribution
                </h3>
              </div>

              {/* Toggle: Project-Specific vs Lifetime Languages */}
              <div className="flex items-center bg-[#1f1f23] p-0.5 rounded-lg border border-[#27272a] text-[11px]">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('project')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    activeLangTab === 'project'
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  This Project ({stats?.languages?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('lifetime')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    activeLangTab === 'lifetime'
                      ? 'bg-brand-orange text-white shadow-sm'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Lifetime ({stats?.lifetimeLanguages?.length || 0})
                </button>
              </div>
            </div>

            {/* Language Breakdown */}
            {activeLanguages.length > 0 ? (
              <div className="space-y-3">
                {/* Visual Stacked Bar */}
                <div className="h-3 rounded-full overflow-hidden flex bg-[#1f1f23] border border-[#27272a]">
                  {activeLanguages.map((lang, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${Math.max(1, lang.percent)}%`,
                        backgroundColor: lang.color || '#ea580c',
                      }}
                      title={`${lang.name}: ${lang.text} (${lang.percent.toFixed(1)}%)`}
                    />
                  ))}
                </div>

                {/* Legend Badges */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {activeLanguages.slice(0, 8).map((lang, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lang.color || '#ea580c' }}
                        />
                        <span className="font-medium text-white truncate">
                          {lang.name}
                        </span>
                      </div>
                      <span className="font-mono text-[#a1a1aa] text-[11px] shrink-0">
                        {lang.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[#71717a] bg-[#18181b] rounded-xl border border-[#27272a]">
                No language telemetry recorded for {activeProjectName}.
              </div>
            )}
          </div>

          {/* Interactive Reviewer Pass/Fail Checklist */}
          <div className="p-5 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Stage 0 Verification: Telemetry & Velocity Checks
              </h3>
              <span className="text-xs text-[#a1a1aa]">Select Pass or Fail for each criterion</span>
            </div>

            <div className="space-y-2.5">
              <PassFailControl
                label="Hackatime Heartbeats Exist and Timestamped"
                description="Heartbeats logged during the project development window matching claimed hours (or private account verified)."
                status={reviewChecklist['stage0_heartbeats_verified']}
                onPass={() => handlePass('stage0_heartbeats_verified')}
                onFail={() => handleFail('stage0_heartbeats_verified')}
              />

              <PassFailControl
                label={<span>Project Name <strong className="font-mono text-white">{activeProjectName}</strong> Aligns</span>}
                description="Selected Hackatime project name corresponds directly with the submitted codebase (or alias verified)."
                status={reviewChecklist['stage0_project_aligned']}
                onPass={() => handlePass('stage0_project_aligned')}
                onFail={() => handleFail('stage0_project_aligned')}
              />

              <PassFailControl
                label={`Tracked Hours (${stats?.projectHoursReadable || `${project.submittedHours}h`}) Plausible`}
                description="Editor velocity reflects active programming, not an idle terminal or automated script."
                status={reviewChecklist['stage0_velocity_plausible']}
                onPass={() => handlePass('stage0_velocity_plausible')}
                onFail={() => handleFail('stage0_velocity_plausible')}
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
                  placeholder="Reason for telemetry concern (e.g. private profile, missing heartbeats)..."
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
                <span>Flag Telemetry Concern</span>
              </button>
            )}

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-brand-orange text-white hover:bg-orange-600 text-xs font-semibold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>Continue to Past Submissions & Double-Dip →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
