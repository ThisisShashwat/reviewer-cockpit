import React, { useEffect, useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  Check,
  Code2,
  ExternalLink,
  FolderCheck,
  RefreshCw,
  Undo2,
  X,
  Zap,
} from 'lucide-react';
import { fetchHackatimeData } from '../../lib/api';
import { CockpitProject, HackatimeProjectStats, GitHubRepoData } from '../../lib/types';
import { MultiOptionSelector, SelectorOption } from '../common/MultiOptionSelector';

interface TelemetryIntrospectStageProps {
  project: CockpitProject;
  gitHubData?: Partial<GitHubRepoData>;
  onAdvance: () => void;
  onEarlyExit?: (reason: string) => void;
  reviewChecklist?: Record<string, any>;
  onToggleChecklist?: (key: string, status?: any) => void;
}

export type TelemetryStatus = 'pass' | 'missing' | 'suspicious';

const TELEMETRY_OPTIONS: SelectorOption<TelemetryStatus>[] = [
  {
    id: 'pass',
    label: 'Pass (Heartbeats Verified)',
    color: 'emerald',
    icon: Check,
    description: 'Heartbeats match claimed hours and language distribution looks authentic',
  },
  {
    id: 'missing',
    label: 'Missing Telemetry',
    color: 'amber',
    icon: AlertTriangle,
    description: 'No telemetry heartbeats recorded or project profile is private/untracked',
  },
  {
    id: 'suspicious',
    label: 'Suspicious Telemetry',
    color: 'rose',
    icon: X,
    description: 'Sudden artificial heartbeat spikes, idle editor hours, or mismatched timestamps',
  },
];

const telemetryCache = new Map<string, Partial<HackatimeProjectStats>>();

export const TelemetryIntrospectStage: React.FC<TelemetryIntrospectStageProps> = ({
  project,
  gitHubData,
  onAdvance,
  onEarlyExit: _onEarlyExit,
  reviewChecklist = {},
  onToggleChecklist,
}) => {
  const selectedProjName = (project.hackatimeProjects || '').trim();
  const initialCleanName =
    selectedProjName.replace(/\s*\([^)]*\)/g, '').trim() || project.projectName;

  const [activeProjectName, setActiveProjectName] = useState(initialCleanName);
  const cacheKey = `${project.hackatimeId || ''}:${activeProjectName}`;
  const [stats, setStats] = useState<Partial<HackatimeProjectStats> | null>(
    () => telemetryCache.get(cacheKey) || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !telemetryCache.has(cacheKey));
  const [activeLangTab, setActiveLangTab] = useState<'project' | 'lifetime'>('project');
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    setActiveProjectName(initialCleanName);
  }, [project.id, initialCleanName]);

  useEffect(() => {
    let mounted = true;
    const currentKey = `${project.hackatimeId || ''}:${activeProjectName}`;

    if (telemetryCache.has(currentKey)) {
      setStats(telemetryCache.get(currentKey)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (project.hackatimeId) {
      fetchHackatimeData(project.hackatimeId, activeProjectName)
        .then((res) => {
          telemetryCache.set(currentKey, res);
          if (mounted) {
            setStats(res);
            setIsLoading(false);
          }
        })
        .catch(() => {
          const errData = {
            error: 'Hackatime API unreachable or profile is private',
            isProjectFound: false,
          };
          telemetryCache.set(currentKey, errData);
          if (mounted) {
            setStats(errData);
            setIsLoading(false);
          }
        });
    } else {
      const errData = {
        error: 'No Hackatime ID provided in submission',
        isProjectFound: false,
      };
      telemetryCache.set(currentKey, errData);
      setStats(errData);
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [project.hackatimeId, activeProjectName]);

  const availableProjects = stats?.projects || [];
  const projectLanguages = stats?.languages || [];
  const lifetimeLanguages = stats?.lifetimeLanguages || [];
  const activeLanguages =
    activeLangTab === 'project' && projectLanguages.length > 0
      ? projectLanguages
      : lifetimeLanguages;

  const cleanProjectName = (project.hackatimeProjects || project.projectName || '')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

  // Introspect URL with all prefilled parameters
  const introspectParams = new URLSearchParams();
  if (project.codeUrl) introspectParams.set('repo_url', project.codeUrl);
  if (project.playableUrl) introspectParams.set('demo_url', project.playableUrl);
  if ((project as any).slackMemberId || (project as any).slackId) {
    introspectParams.set('slack_id', (project as any).slackMemberId || (project as any).slackId);
  }
  if (project.hackatimeId) introspectParams.set('hackatime_user', project.hackatimeId);
  if (project.submittedHours) introspectParams.set('hours', String(project.submittedHours));
  if (project.submittedAt) introspectParams.set('submission_date', project.submittedAt);
  if (cleanProjectName) introspectParams.set('hackatime_projects', cleanProjectName);

  const introspectUrl = `https://introspect.sahil.ink/?${introspectParams.toString()}`;

  const currentTelemetryStatus: TelemetryStatus | undefined =
    reviewChecklist['telemetry_heartbeats_status'] ||
    (reviewChecklist['telemetry_heartbeats_verified'] === true
      ? 'pass'
      : reviewChecklist['telemetry_heartbeats_verified'] === false
      ? 'suspicious'
      : undefined);

  const handleTelemetryStatusChange = (val: TelemetryStatus) => {
    onToggleChecklist?.('telemetry_heartbeats_status', val);
    if (val === 'pass') {
      onToggleChecklist?.('telemetry_heartbeats_verified', true);
      onToggleChecklist?.('hackatime_sanity', true);
    } else if (val === 'missing') {
      onToggleChecklist?.('telemetry_heartbeats_verified', false);
      onToggleChecklist?.('hackatime_sanity', false);
    } else if (val === 'suspicious') {
      onToggleChecklist?.('telemetry_heartbeats_verified', false);
      onToggleChecklist?.('hackatime_sanity', false);
    }
  };

  const isProjectNameManuallyOverridden = activeProjectName !== initialCleanName;
  const projectHoursNum = stats?.projectSeconds ? stats.projectSeconds / 3600 : 0;
  const hasLongClaim = project.submittedHours > 24 || projectHoursNum > 24;

  // Calculate total code additions from GitHub commits
  const totalCodeAdditions = useMemo(() => {
    const rawCommits = gitHubData?.commits || [];
    let sum = 0;
    rawCommits.forEach((c) => {
      if (c.files && c.files.length > 0) {
        c.files.forEach((f) => {
          const lower = f.filename.toLowerCase();
          const isDocOrAsset =
            lower.endsWith('.md') ||
            lower.endsWith('.txt') ||
            lower.endsWith('.png') ||
            lower.endsWith('.jpg') ||
            lower.endsWith('.jpeg') ||
            lower.endsWith('.svg') ||
            lower.endsWith('.ico') ||
            lower.endsWith('.lock') ||
            lower.endsWith('-lock.json');
          if (!isDocOrAsset) {
            sum += f.additions || 0;
          }
        });
      } else {
        sum += c.additions || 0;
      }
    });
    return sum;
  }, [gitHubData?.commits]);

  const effectiveHours = projectHoursNum > 0 ? projectHoursNum : project.submittedHours || 0;
  const linesPerHour =
    effectiveHours > 0
      ? Math.round(totalCodeAdditions / Math.max(0.1, effectiveHours))
      : totalCodeAdditions;

  // Unrealistic velocity condition:
  // e.g. >= 400 loc/hr with at least 500 lines total, OR >= 800 lines with <= 1 hr claimed/tracked
  const isUnrealisticVelocity =
    totalCodeAdditions >= 500 &&
    (linesPerHour >= 400 || (effectiveHours <= 1.0 && totalCodeAdditions >= 800));

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 4 of 7
            </span>
            <span className="text-xs text-content-tertiary">Telemetry & Timeline Audit</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
              Hackatime Telemetry & Activity Timeline
            </h2>
            {isUnrealisticVelocity && (
              <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse shadow-sm">
                <Zap className="w-3 h-3 text-rose-400" />
                <span>Unrealistic Velocity ({linesPerHour.toLocaleString()} loc/h)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Audit coding heartbeats, velocity, AI assistance share, and interactive commit timeline for @<strong className="text-content-primary">{project.githubUsername}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIframeKey((k) => k + 1)}
            className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
            title="Reload Timeline frame"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Timeline</span>
          </button>

          <a
            href={introspectUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Open Fullscreen</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {project.hackatimeId && (
            <a
              href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats?filter_by_project=${encodeURIComponent(activeProjectName)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-medium text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-brand-orange" />
              <span>Raw Telemetry</span>
              <ExternalLink className="w-3 h-3 text-content-muted" />
            </a>
          )}

          <button
            type="button"
            onClick={onAdvance}
            className="px-3.5 py-1.5 rounded-lg bg-[#ff6b35] hover:bg-[#ea580c] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
          >
            <span>Next: Commits & AI →</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Project Telemetry & Heartbeats Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        {/* Left Column: Project Stats & Heartbeats (7 Cols) */}
        <div className="lg:col-span-7 bg-[#121214] border border-[#27272a] rounded-2xl p-5 text-white shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <div className="flex items-center gap-2">
              <FolderCheck className="w-4 h-4 text-brand-orange" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Hackatime Project Telemetry
              </h3>
              {isUnrealisticVelocity && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse shadow-sm">
                  <Zap className="w-3 h-3 text-rose-400" />
                  <span>Unrealistic Velocity</span>
                </span>
              )}
            </div>

            {/* Renamed project switcher */}
            {availableProjects.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={activeProjectName}
                  onChange={(e) => setActiveProjectName(e.target.value)}
                  className="bg-[#18181b] border border-[#3f3f46] rounded-lg px-2 py-1 text-xs text-[#e4e4e7] font-mono focus:outline-none focus:border-brand-orange"
                >
                  <option value={initialCleanName}>
                    {initialCleanName} (Submitted)
                  </option>
                  {availableProjects
                    .filter((p) => p !== initialCleanName)
                    .map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>

                {isProjectNameManuallyOverridden && (
                  <button
                    type="button"
                    onClick={() => setActiveProjectName(initialCleanName)}
                    className="p-1 rounded bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white"
                    title="Reset to submitted project name"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono block">
                Claimed Hours
              </span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {project.submittedHours} hrs
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono block">
                Tracked on Project
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {isLoading
                  ? '...'
                  : stats?.projectHoursReadable ||
                    (stats?.projectSeconds ? `${(stats.projectSeconds / 3600).toFixed(1)}h` : '0h')}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
              <span className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono block">
                Lifetime Account
              </span>
              <span className="text-lg font-mono font-bold text-[#e4e4e7]">
                {isLoading ? '...' : stats?.totalHoursReadable || '—'}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isUnrealisticVelocity
                  ? 'bg-rose-950/30 border-rose-500/40'
                  : 'bg-[#18181b] border-[#27272a]'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] uppercase tracking-wider text-[#a1a1aa] font-mono block">
                  Coding Velocity
                </span>
                {isUnrealisticVelocity ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-rose-500/30 text-rose-300 border border-rose-400/40">
                    Abnormal
                  </span>
                ) : linesPerHour > 250 ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300">
                    Fast
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300">
                    Normal
                  </span>
                )}
              </div>
              <span
                className={`text-lg font-mono font-bold ${
                  isUnrealisticVelocity
                    ? 'text-rose-400'
                    : linesPerHour > 250
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {totalCodeAdditions > 0 ? `${linesPerHour.toLocaleString()} loc/h` : '—'}
              </span>
            </div>
          </div>

          {/* Unrealistic Typing Velocity Alert Card */}
          {isUnrealisticVelocity && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 shadow-md">
              <Zap className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-300">Unrealistic Velocity Alert</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-rose-500/30 text-rose-300 border border-rose-400/40">
                    {linesPerHour.toLocaleString()} lines/hr
                  </span>
                </div>
                <p className="text-[11px] text-rose-200/90 mt-0.5 leading-relaxed">
                  Repository introduced <strong>{totalCodeAdditions.toLocaleString()} lines of code</strong> across <strong>{effectiveHours.toFixed(1)} hrs</strong> (~{(linesPerHour / 60).toFixed(1)} lines/min). Organic human coding velocity is typically 30–100 lines/hr. Velocity through the roof often indicates an uncredited tutorial clone, template import, or monolithic AI vibe dump.
                </p>
              </div>
            </div>
          )}

          {/* Long Claim Notice */}
          {hasLongClaim && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">High Hours Claim (&gt; 24 hrs)</span>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Large claims require verification of sustained commit progression in Stage 4 to ensure active engineering rather than an idle editor.
                </p>
              </div>
            </div>
          )}

          {/* Heartbeat Category Telemetry Breakdown */}
          {stats && stats.aiPercent !== undefined && stats.aiPercent > 0 && (
            <div className="p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-purple-400" />
                  Heartbeat Category Distribution
                </span>
                <span className="font-mono text-[11px] text-[#a1a1aa]">
                  AI: {stats.aiPercent}% · Human: {stats.humanPercent ?? 100}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.humanPercent ?? 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Human Coding: ${stats.humanPercent ?? 100}%`}
                />
                <div
                  style={{ width: `${stats.aiPercent}%` }}
                  className="bg-purple-500 h-full"
                  title={`AI Coding: ${stats.aiPercent}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa] pt-1">
                <span className="text-emerald-400">
                  ● Human: {stats.humanHoursReadable || (stats.humanSeconds ? `${(stats.humanSeconds / 3600).toFixed(1)}h` : '0h')}
                </span>
                <span className="text-purple-400">
                  ● AI: {stats.aiHoursReadable || (stats.aiSeconds ? `${(stats.aiSeconds / 3600).toFixed(1)}h` : '0h')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Project Language Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-[#121214] border border-[#27272a] rounded-2xl p-5 text-white shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-orange" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Editor Languages
                </h3>
              </div>

              <div className="flex items-center bg-[#18181b] p-0.5 rounded-lg border border-[#27272a] text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveLangTab('project')}
                  className={`px-2 py-0.5 rounded font-semibold ${
                    activeLangTab === 'project'
                      ? 'bg-brand-orange text-white'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  This Project
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLangTab('lifetime')}
                  className={`px-2 py-0.5 rounded font-semibold ${
                    activeLangTab === 'lifetime'
                      ? 'bg-brand-orange text-white'
                      : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Lifetime
                </button>
              </div>
            </div>

            <div className="space-y-2.5 pt-3">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-[#71717a]">
                  Loading language telemetry...
                </div>
              ) : activeLanguages.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#71717a]">
                  No language heartbeats recorded for {activeLangTab} profile.
                </div>
              ) : (
                activeLanguages.slice(0, 5).map((lang) => (
                  <div key={lang.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#e4e4e7]">{lang.name}</span>
                      <span className="text-[#a1a1aa]">
                        {lang.percent.toFixed(1)}% ({lang.hours ? `${lang.hours.toFixed(1)}h` : lang.text})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, lang.percent)}%` }}
                        className="bg-brand-orange h-full rounded-full"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#27272a] space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#a1a1aa]">Telemetry Verdict</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    currentTelemetryStatus === 'pass'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : currentTelemetryStatus === 'missing'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : currentTelemetryStatus === 'suspicious'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {currentTelemetryStatus === 'pass'
                    ? 'PASS'
                    : currentTelemetryStatus === 'missing'
                    ? 'MISSING'
                    : currentTelemetryStatus === 'suspicious'
                    ? 'SUSPICIOUS'
                    : 'PENDING'}
                </span>
              </div>
              <MultiOptionSelector<TelemetryStatus>
                value={currentTelemetryStatus}
                onChange={handleTelemetryStatusChange}
                options={TELEMETRY_OPTIONS}
                size="xs"
              />
            </div>

            {currentTelemetryStatus && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
                <input
                  type="text"
                  value={reviewChecklist['note_telemetry_heartbeats'] || ''}
                  onChange={(e) => onToggleChecklist?.('note_telemetry_heartbeats', e.target.value)}
                  placeholder="Optional note (e.g. 0 project seconds, idle time spikes, unverified repo...)"
                  className="flex-1 bg-[#18181b] border border-[#27272a] rounded-lg px-2.5 py-1 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Seamless Integrated Introspect Timeline Frame */}
      <div className="rounded-2xl border border-border-subtle bg-white overflow-hidden shadow-sm flex-1 min-h-[560px]">
        <iframe
          key={iframeKey}
          src={introspectUrl}
          title="Development Timeline Inspector"
          className="w-full h-full min-h-[550px] border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Footer Navigation Bar */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 text-xs">
          {currentTelemetryStatus === 'pass' ? (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span>● Telemetry Heartbeats Verified</span>
            </span>
          ) : currentTelemetryStatus === 'missing' ? (
            <span className="text-amber-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Telemetry Missing or Untracked</span>
            </span>
          ) : currentTelemetryStatus === 'suspicious' ? (
            <span className="text-rose-400 font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>Telemetry Flagged as Suspicious</span>
            </span>
          ) : (
            <span className="text-zinc-400 font-semibold flex items-center gap-1.5">
              <span>Telemetry Audit Pending</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onAdvance}
          className="px-5 py-2.5 rounded-xl bg-[#ff6b35] text-white font-bold hover:bg-[#ea580c] transition-all shadow-md flex items-center gap-1.5 cursor-pointer text-xs"
        >
          <span>Next: Commits & AI Forensics →</span>
        </button>
      </div>
    </div>
  );
};
