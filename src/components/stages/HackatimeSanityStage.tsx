import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Code2,
  ExternalLink,
  Flame,
  RefreshCw,
  XOctagon,
} from 'lucide-react';
import { fetchHackatimeData } from '../../lib/api';
import { CockpitProject, HackatimeProjectStats } from '../../lib/types';

interface HackatimeSanityStageProps {
  project: CockpitProject;
  onAdvance: () => void;
  onEarlyExit: (reason: string) => void;
}

export const HackatimeSanityStage: React.FC<HackatimeSanityStageProps> = ({
  project,
  onAdvance,
  onEarlyExit,
}) => {
  const [stats, setStats] = useState<Partial<HackatimeProjectStats> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Velocity and project match analysis
  const totalHours = stats?.totalSeconds ? Math.round((stats.totalSeconds / 3600) * 10) / 10 : 0;
  const isHighVelocity = project.submittedHours > 16;
  const isProjectNameFuzzyMatched =
    stats?.projects?.some((p) => {
      const pNorm = p.toLowerCase().replace(/[-_]/g, '');
      const projNorm = project.projectName.toLowerCase().replace(/[-_]/g, '');
      return pNorm.includes(projNorm) || projNorm.includes(pNorm);
    }) ?? false;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <Activity className="w-5 h-5 text-rv-accent" />
            Stage 0: Hackatime Sanity & Velocity Checker
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            Verify that tracked heartbeats exist, project names align, and time wasn't logged by a bot script.
          </p>
        </div>

        {project.hackatimeId && (
          <a
            href={`https://hackatime.hackclub.com/api/v1/users/${encodeURIComponent(project.hackatimeId)}/stats`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs font-medium text-rv-dim hover:text-rv-text flex items-center gap-1.5 transition-colors"
          >
            <span>Raw JSON</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-rv-dim text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-rv-accent" />
          <span>Querying public Hackatime telemetry for @{project.hackatimeId}...</span>
        </div>
      ) : (
        <>
          {/* Quick Health Status Banners */}
          {isHighVelocity && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 flex items-start justify-between gap-3 text-red-300">
              <div className="flex items-start gap-3">
                <XOctagon className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-200">
                    🚨 Extreme Velocity Spike Detected ({project.submittedHours}h)
                  </h4>
                  <p className="text-xs mt-1 text-red-300/90 leading-relaxed">
                    Over 16 hours submitted in a single stretch. GitBook guidelines require verifying active commit progression or deflating idle bot time.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onEarlyExit(`Unrealistic velocity spike (${project.submittedHours}h in single window) - likely script or idle timer.`)}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
              >
                Reject for Bot Spike
              </button>
            </div>
          )}

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Account Hours */}
            <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1">
              <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                Hackatime Recorded
              </span>
              <div className="text-2xl font-bold font-mono text-rv-text">
                {stats?.totalHoursReadable || `${totalHours}h`}
              </div>
              <p className="text-[11px] text-rv-dim">
                Total editor telemetry logged by @{project.hackatimeId || 'unknown'}
              </p>
            </div>

            {/* Requested Hours */}
            <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1">
              <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rv-accent" />
                Requested on Submission
              </span>
              <div className="text-2xl font-bold font-mono text-rv-text">
                {project.submittedHours}h
              </div>
              <p className="text-[11px] text-rv-dim">
                Claimed hours for {project.projectName}
              </p>
            </div>

            {/* Project Name Match */}
            <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-1">
              <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                Project Name Alignment
              </span>
              <div className="flex items-center gap-2 pt-0.5">
                {isProjectNameFuzzyMatched ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle className="w-3.5 h-3.5" /> Matched in Projects
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" /> Manual Check Needed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-rv-dim truncate">
                {project.hackatimeProjects || 'No project list reported'}
              </p>
            </div>
          </div>

          {/* Languages Distribution */}
          <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rv-text flex items-center gap-2">
              <Code2 className="w-4 h-4 text-rv-accent" />
              Editor Heartbeat Language Distribution
            </h3>

            {stats?.languages && stats.languages.length > 0 ? (
              <div className="space-y-2">
                {/* Visual language bar */}
                <div className="h-3 rounded-full bg-rv-surface2 overflow-hidden flex border border-rv-border">
                  {stats.languages.slice(0, 6).map((lang, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${Math.max(lang.percent, 3)}%`,
                        backgroundColor: lang.color || '#ff6b35',
                      }}
                      title={`${lang.name}: ${lang.percent}% (${lang.text})`}
                    />
                  ))}
                </div>

                {/* Legend Chips */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {stats.languages.slice(0, 8).map((lang, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rv-surface2 border border-rv-border text-xs text-rv-text"
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: lang.color || '#ff6b35' }}
                      />
                      <span className="font-medium">{lang.name}</span>
                      <span className="text-[11px] text-rv-dim font-mono">
                        {lang.percent.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-rv-dim py-2">
                No language telemetry data found for this Hackatime user account.
              </p>
            )}
          </div>

          {/* Stepper Navigation Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-rv-border">
            <button
              type="button"
              onClick={() => onEarlyExit('Tracker anomaly or zero verifiable heartbeats for requested project')}
              className="px-3.5 py-2 rounded-lg bg-rv-surface2 border border-rv-border text-red-400 hover:bg-red-950/40 hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flag Tracker Anomaly</span>
            </button>

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-rv-accent text-white hover:bg-rv-accent/90 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Pass Sanity & Go to Stage 1 (Double-Dip) →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
