import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  XOctagon,
} from 'lucide-react';
import { fetchManifestLookup } from '../../lib/api';
import { CockpitProject, ManifestLookupData } from '../../lib/types';

interface ManifestDoubleDipStageProps {
  project: CockpitProject;
  onAdvance: () => void;
  onEarlyExit: (reason: string) => void;
  onApplyDeltaHours?: (hours: number, justification: string) => void;
}

export const ManifestDoubleDipStage: React.FC<ManifestDoubleDipStageProps> = ({
  project,
  onAdvance,
  onEarlyExit,
  onApplyDeltaHours,
}) => {
  const [data, setData] = useState<ManifestLookupData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Calculate prior approved hours across other YSWS
  const priorApprovedHours =
    data?.otherSubmissions?.reduce(
      (sum, s) => (s.shipStatus.toLowerCase() === 'approved' && s.hoursShipped ? sum + s.hoursShipped : sum),
      0
    ) ?? 0;

  const isDoubleDipDetected = data?.isRegistered && data.otherSubmissions.length > 0;
  const netDeltaHours = Math.max(0, Math.round((project.submittedHours - priorApprovedHours) * 10) / 10);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <Layers className="w-5 h-5 text-rv-accent" />
            Stage 1: Manifest Cross-YSWS Double-Dipping Checker
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            Query the unified Hack Club Manifest database to verify whether this repository was previously rewarded.
          </p>
        </div>

        <a
          href={data?.halceonUrl || `https://lin6bu84s73ya069zkua89ny.halceon.dev/u?q=${encodeURIComponent(project.githubUsername)}`}
          target="_blank"
          rel="noreferrer"
          className="px-3 py-1.5 rounded-lg bg-rv-surface2 border border-rv-border text-xs font-semibold text-rv-accent hover:bg-rv-surface3 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Halceon Profile Lookup</span>
          <ExternalLink className="w-3 h-3 text-rv-dim" />
        </a>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-rv-dim text-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-rv-accent" />
          <span>Querying Manifest for repository {project.codeUrl}...</span>
        </div>
      ) : (
        <>
          {/* Status Alert Banner */}
          {!isDoubleDipDetected ? (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-start gap-3 text-emerald-300">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                  Clean Manifest Check — Zero Cross-Program Duplicates
                </h4>
                <p className="text-xs mt-1 text-emerald-300/90 leading-relaxed">
                  Repository has not been registered in Manifest for High Seas, Arcade, Blot, or other YSWS programs.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex items-start justify-between gap-3 text-amber-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-200">
                    ⚠️ Prior YSWS Submissions Found ({data.otherSubmissions.length})
                  </h4>
                  <p className="text-xs mt-1 text-amber-300/90 leading-relaxed">
                    This repository was submitted to other programs. If approved previously, only the delta of NEW hours can be granted.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onEarlyExit(
                    `Double-Dipped: Repository previously submitted to ${data.otherSubmissions.map((s) => s.yswsName).join(', ')} without verifiable major overhaul.`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 transition-colors shadow-sm"
              >
                Reject: Double-Dipped
              </button>
            </div>
          )}

          {/* Resubmission Delta Calculator Card */}
          {priorApprovedHours > 0 && (
            <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rv-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rv-accent" />
                  Automatic Resubmission Delta Calculator
                </h3>
                <span className="text-[11px] font-mono text-rv-muted">
                  GitBook Rule: Prior hours must be deducted
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border">
                  <span className="text-[11px] text-rv-dim block mb-1">Total Tracked</span>
                  <span className="text-lg font-bold font-mono text-rv-text">
                    {project.submittedHours}h
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border">
                  <span className="text-[11px] text-rv-dim block mb-1">Prior Approved</span>
                  <span className="text-lg font-bold font-mono text-amber-400">
                    -{priorApprovedHours}h
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border">
                  <span className="text-[11px] text-rv-dim block mb-1">Allowable Net Delta</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {netDeltaHours}h
                  </span>
                </div>
              </div>

              {onApplyDeltaHours && (
                <button
                  type="button"
                  onClick={() =>
                    onApplyDeltaHours(
                      netDeltaHours,
                      `Deducted ${priorApprovedHours}h previously approved in other YSWS submissions. Net delta approved: ${netDeltaHours}h.`
                    )
                  }
                  className="w-full py-2 rounded-lg bg-rv-accent/20 border border-rv-accent/40 text-rv-accent hover:bg-rv-accent hover:text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply {netDeltaHours}h Net Delta to Verdict Desk</span>
                </button>
              )}
            </div>
          )}

          {/* Submissions Table */}
          {data?.otherSubmissions && data.otherSubmissions.length > 0 && (
            <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rv-text">
                Cross-Program Records
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rv-border text-[11px] text-rv-muted uppercase">
                      <th className="pb-2 font-semibold">Program</th>
                      <th className="pb-2 font-semibold">Status</th>
                      <th className="pb-2 font-semibold">Hours</th>
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rv-border/50 text-rv-text">
                    {data.otherSubmissions.map((s, idx) => (
                      <tr key={idx} className="hover:bg-rv-surface2/50">
                        <td className="py-2.5 font-medium">{s.yswsName || 'YSWS'}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              s.shipStatus.toLowerCase() === 'approved'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rv-surface2 text-rv-dim'
                            }`}
                          >
                            {s.shipStatus}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-rv-dim">
                          {s.hoursShipped ? `${s.hoursShipped}h` : '—'}
                        </td>
                        <td className="py-2.5 text-rv-dim">
                          {s.approvedAt
                            ? new Date(s.approvedAt).toLocaleDateString()
                            : s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                        <td className="py-2.5 font-mono text-rv-muted text-[10px]">
                          {s.submissionId.slice(-6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Advance Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-rv-border">
            <button
              type="button"
              onClick={() => onEarlyExit('Double-dipped duplicate project submission')}
              className="px-3.5 py-2 rounded-lg bg-rv-surface2 border border-rv-border text-red-400 hover:bg-red-950/40 hover:border-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <XOctagon className="w-3.5 h-3.5" />
              <span>Reject for Duplicate</span>
            </button>

            <button
              type="button"
              onClick={onAdvance}
              className="px-5 py-2 rounded-lg bg-rv-accent text-white hover:bg-rv-accent/90 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              <span>Pass Manifest & Go to Stage 2 (Shipping) →</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
