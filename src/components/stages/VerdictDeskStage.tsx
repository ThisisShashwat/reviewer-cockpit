import React from 'react';
import {
  CheckCircle,
  Copy,
  ShieldCheck,
  Keyboard,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, VerdictDetails } from '../../lib/types';

interface VerdictDeskStageProps {
  project: CockpitProject;
  verdict?: VerdictDetails;
  onOpenAdminDesk: () => void;
}

export const VerdictDeskStage: React.FC<VerdictDeskStageProps> = ({
  project,
  verdict,
  onOpenAdminDesk,
}) => {
  const currentAction = verdict?.action || 'pre_approve';
  const approvedHours = verdict?.approvedHours ?? project.submittedHours;
  const deflatedHours = verdict?.deflatedHours ?? 0;

  const copyJustification = () => {
    const text = verdict?.hoursJustification || 'Verified project delivers working code and matches tracked velocity.';
    navigator.clipboard.writeText(text);
    toast.success('Justification copied to clipboard!');
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-rv-border">
        <div>
          <h2 className="text-base font-bold text-rv-text flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Stage 5: Final Reviewer Verdict Desk
          </h2>
          <p className="text-xs text-rv-dim mt-0.5">
            Review your technical decision, verify justification compliance, and submit to the Admin Clipboard Desk.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAdminDesk}
          className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Open Admin Clipboard Queue</span>
        </button>
      </div>

      {/* Audit Checklist Summary of Stages 0 - 4 */}
      <div className="p-4 rounded-xl bg-rv-surface border border-rv-border space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-rv-text">
          Triage Stepper Verification Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rv-text block">
                Stage 0: Hackatime Velocity Sanity
              </span>
              <p className="text-[11px] text-rv-dim mt-0.5">
                Heartbeat distribution verified. Peak velocity within acceptable human limits.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rv-text block">
                Stage 1: Manifest Double-Dip Check
              </span>
              <p className="text-[11px] text-rv-dim mt-0.5">
                Cross-YSWS database queried. Prior approved hours checked and deducted if applicable.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rv-text block">
                Stage 2: Shipping Deliverables
              </span>
              <p className="text-[11px] text-rv-dim mt-0.5">
                Complies with host rules. Interactive demo tested and release assets verified.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rv-text block">
                Stage 3 & 4: Commits & AI Quality
              </span>
              <p className="text-[11px] text-rv-dim mt-0.5">
                Iterative commits verified. Substantive code changes confirmed without single-prompt slop.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Summary Card */}
      <div className="p-5 rounded-xl bg-gradient-to-br from-rv-surface to-rv-surface2 border border-rv-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block">
              Active Verdict Status
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xl font-bold text-rv-text uppercase font-mono">
                {currentAction.replace('_', ' ')}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                {approvedHours}h Recommended
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-rv-dim block">Requested vs Approved</span>
            <div className="text-sm font-mono font-bold text-rv-text">
              {project.submittedHours}h → {approvedHours}h
            </div>
            {deflatedHours > 0 && (
              <span className="text-[11px] font-mono text-red-400">
                -{deflatedHours}h deflation applied
              </span>
            )}
          </div>
        </div>

        {/* Live Justification Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-rv-text flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-rv-accent" />
              GitBook Justification
            </span>
            <button
              type="button"
              onClick={copyJustification}
              className="text-[11px] text-rv-accent hover:underline flex items-center gap-1 font-medium"
            >
              <Copy className="w-3 h-3" />
              Copy Justification
            </button>
          </div>
          <div className="p-3.5 rounded-lg bg-rv-bg border border-rv-border text-xs font-mono text-rv-text whitespace-pre-wrap leading-relaxed">
            {verdict?.hoursJustification || 'Ready to submit in Right Sidebar.'}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference Bar */}
      <div className="p-4 rounded-xl bg-rv-surface border border-rv-border">
        <h4 className="text-xs font-bold text-rv-text uppercase tracking-wider flex items-center gap-2 mb-3">
          <Keyboard className="w-4 h-4 text-rv-accent" />
          Pro-Reviewer Keyboard Shortcuts
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-rv-surface2 border border-rv-border flex items-center justify-between">
            <span className="text-rv-dim">Next Submission</span>
            <kbd className="px-2 py-0.5 rounded bg-rv-bg border border-rv-border font-mono font-bold text-rv-accent">
              N
            </kbd>
          </div>
          <div className="p-2 rounded bg-rv-surface2 border border-rv-border flex items-center justify-between">
            <span className="text-rv-dim">Previous Submission</span>
            <kbd className="px-2 py-0.5 rounded bg-rv-bg border border-rv-border font-mono font-bold text-rv-accent">
              P
            </kbd>
          </div>
          <div className="p-2 rounded bg-rv-surface2 border border-rv-border flex items-center justify-between">
            <span className="text-rv-dim">Triage Stages</span>
            <kbd className="px-2 py-0.5 rounded bg-rv-bg border border-rv-border font-mono font-bold text-rv-accent">
              0 - 5
            </kbd>
          </div>
          <div className="p-2 rounded bg-rv-surface2 border border-rv-border flex items-center justify-between">
            <span className="text-rv-dim">Quick Copy Verdict</span>
            <kbd className="px-2 py-0.5 rounded bg-rv-bg border border-rv-border font-mono font-bold text-rv-accent">
              C
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
