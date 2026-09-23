import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileText,
  ShieldCheck,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, VerdictDetails } from '../../lib/types';
import { submitCockpitVerdict } from '../../lib/api';

interface VerdictDeskStageProps {
  project: CockpitProject;
  verdict?: VerdictDetails;
  reviewChecklist?: Record<string, boolean>;
  onVerdictSubmitted?: (verdict: VerdictDetails, updatedProject: CockpitProject) => void;
  onOpenAdminDesk?: () => void;
}

export const VerdictDeskStage: React.FC<VerdictDeskStageProps> = ({
  project,
  verdict,
  reviewChecklist = {},
  onVerdictSubmitted,
  onOpenAdminDesk,
}) => {
  const [action, setAction] = useState<'pre_approve' | 'reject' | 'flag_fraud'>(
    verdict?.action || 'pre_approve'
  );
  const [approvedHours, setApprovedHours] = useState<number>(
    verdict?.approvedHours ?? project.submittedHours
  );
  const [deflatedHours, setDeflatedHours] = useState<number>(verdict?.deflatedHours ?? 0);
  const [justification, setJustification] = useState<string>(
    verdict?.hoursJustification ||
      `Verified ${project.projectName} delivers working software matching claimed velocity.`
  );
  const [internalNotes, setInternalNotes] = useState<string>(verdict?.internalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passedCount = Object.values(reviewChecklist).filter((v) => v === true).length;
  const failedCount = Object.values(reviewChecklist).filter((v) => v === false).length;

  const handleSubmitVerdict = async () => {
    setIsSubmitting(true);
    try {
      const payload: VerdictDetails = {
        action,
        approvedHours,
        deflatedHours,
        hoursJustification: justification.trim(),
        publicFeedback: justification.trim(),
        internalNotes: internalNotes.trim(),
        appliedChecklist: reviewChecklist,
        reviewerName: 'Reviewer',
        decidedAt: new Date().toISOString(),
      };

      const res = await submitCockpitVerdict({
        projectId: project.id,
        action,
        approvedHours,
        deflatedHours,
        hoursJustification: justification.trim(),
        publicFeedback: justification.trim(),
        internalNotes: internalNotes.trim(),
        appliedChecklist: reviewChecklist,
        reviewerName: 'Reviewer',
      });

      if (onVerdictSubmitted) {
        onVerdictSubmitted(payload, res.project);
      }
      toast.success(
        action === 'pre_approve'
          ? `Pre-approved ${approvedHours} hrs for ${project.projectName}`
          : `Verdict submitted for ${project.projectName}`
      );
    } catch {
      toast.error('Failed to submit verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyJustification = () => {
    navigator.clipboard.writeText(justification);
    toast.success('Justification copied to clipboard');
  };

  return (
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto select-text flex flex-col">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 7 of 7
            </span>
            <span className="text-xs text-content-tertiary">Final Verdict Desk</span>
          </div>
          <h2 className="text-lg font-bold text-content-primary mt-1 font-heading">
            Reviewer Technical Verdict & Hours Decision
          </h2>
          <p className="text-xs text-content-tertiary mt-1 max-w-2xl">
            Synthesize the technical audit, set approved hours, record justification, and submit your technical recommendation.
          </p>
        </div>

        {onOpenAdminDesk && (
          <button
            type="button"
            onClick={onOpenAdminDesk}
            className="px-3.5 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
            <span>Admin Export Desk</span>
          </button>
        )}
      </div>

      {/* Review Checklist Summary Strip (Dark Console Card) */}
      <div className="p-4 rounded-xl bg-[#121214] border border-[#27272a] text-white flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white block">
              Audit Checklist Synthesis
            </span>
            <span className="text-[11px] text-[#a1a1aa]">
              Checked across Hackatime, History, Introspect, README, Deliverable, and Commits.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
            {passedCount} Passed
          </span>
          {failedCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
              {failedCount} Concerns
            </span>
          )}
        </div>
      </div>

      {/* Verdict Controls Card (Dark Console Card) */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-5 shadow-lg shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          Decision Action
        </h3>

        {/* Action Toggle Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setAction('pre_approve')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              action === 'pre_approve'
                ? 'bg-emerald-950/40 border-emerald-500/50 ring-2 ring-emerald-500/20 text-white shadow-lg'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Pre-Approve</span>
              <CheckCircle2
                className={`w-4 h-4 ${
                  action === 'pre_approve' ? 'text-emerald-400' : 'text-[#71717a]'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#a1a1aa] mt-1.5 leading-relaxed">
              Project meets technical criteria, code is verified, and hours are plausible.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAction('reject')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              action === 'reject'
                ? 'bg-rose-950/40 border-rose-500/50 ring-2 ring-rose-500/20 text-white shadow-lg'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Flag for Rejection</span>
              <XCircle
                className={`w-4 h-4 ${
                  action === 'reject' ? 'text-rose-400' : 'text-[#71717a]'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#a1a1aa] mt-1.5 leading-relaxed">
              Does not satisfy GitBook rules, deliverable broken, or uncredited double-dip.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAction('flag_fraud')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
              action === 'flag_fraud'
                ? 'bg-amber-950/40 border-amber-500/50 ring-2 ring-amber-500/20 text-white shadow-lg'
                : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa] hover:border-[#3f3f46]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Flag Fraud</span>
              <AlertCircle
                className={`w-4 h-4 ${
                  action === 'flag_fraud' ? 'text-amber-400' : 'text-[#71717a]'
                }`}
              />
            </div>
            <p className="text-[11px] text-[#a1a1aa] mt-1.5 leading-relaxed">
              Stolen code, automated bots, or deliberate bad faith submission.
            </p>
          </button>
        </div>

        {/* Hours Adjustment */}
        {action === 'pre_approve' && (
          <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-orange" />
              Hours Granted
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-[#a1a1aa] block mb-1">
                  Approved Hours (Claimed: {project.submittedHours} hrs)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={approvedHours}
                  onChange={(e) => setApprovedHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-[#27272a] bg-[#121214] text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#a1a1aa] block mb-1">
                  Deflated / Deducted Hours (AI or Prior Submissions)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={deflatedHours}
                  onChange={(e) => setDeflatedHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-[#27272a] bg-[#121214] text-xs font-mono text-[#d4d4d8] focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>
          </div>
        )}

        {/* Justification Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-orange" />
              Decision Justification
            </label>
            <button
              type="button"
              onClick={copyJustification}
              className="text-[11px] text-brand-orange hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Technical verification summary for admin clipboard export..."
            className="w-full p-3 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#d4d4d8] focus:outline-none focus:border-brand-orange leading-relaxed"
          />
        </div>

        {/* Internal Reviewer Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-white">
            Internal Reviewer Notes (Audit Log)
          </label>
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Optional internal reviewer commentary (visible in project audit log)..."
            className="w-full p-3 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#d4d4d8] focus:outline-none focus:border-brand-orange leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSubmitVerdict}
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
              action === 'pre_approve'
                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                : action === 'reject'
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-amber-600 text-white hover:bg-amber-500'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Recording...'
                : action === 'pre_approve'
                ? `Confirm Pre-Approval (${approvedHours} hrs)`
                : action === 'reject'
                ? 'Confirm Rejection Flag'
                : 'Confirm Fraud Flag'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
