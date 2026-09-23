import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  FileText,
  Keyboard,
  ShieldCheck,
  AlertCircle,
  Clock,
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

  const completedChecksCount = Object.values(reviewChecklist).filter(Boolean).length;

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
    <div className="h-full overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto select-text">
      {/* Stage Header */}
      <div className="flex items-start justify-between pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded border border-brand-orange/20">
              Stage 5 of 5
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
            className="px-3.5 py-1.5 rounded-lg bg-canvas-card border border-border-subtle text-xs font-semibold text-content-secondary hover:text-content-primary hover:bg-canvas-hover flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
            <span>Admin Export Desk</span>
          </button>
        )}
      </div>

      {/* Review Checklist Summary Strip */}
      <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-semantic-success">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-content-primary block">
              Audit Checklist Completed ({completedChecksCount} criteria satisfied)
            </span>
            <span className="text-[11px] text-content-tertiary">
              Checked across Hackatime, Manifest, Deliverable, Commits, and AI heuristics.
            </span>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-canvas-subtle border border-border-subtle text-content-secondary">
          {completedChecksCount} checks
        </span>
      </div>

      {/* Verdict Controls Card */}
      <div className="p-6 rounded-xl bg-canvas-card border border-border-subtle space-y-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-content-primary">
          Decision Action
        </h3>

        {/* Action Toggle Pills */}
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setAction('pre_approve')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              action === 'pre_approve'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-canvas-card border-border-subtle hover:bg-canvas-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary">Pre-Approve</span>
              <CheckCircle2
                className={`w-4 h-4 ${
                  action === 'pre_approve' ? 'text-semantic-success' : 'text-content-muted'
                }`}
              />
            </div>
            <p className="text-[11px] text-content-tertiary mt-1">
              Project meets technical criteria and hours are verified.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAction('reject')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              action === 'reject'
                ? 'bg-red-50 border-red-300 ring-2 ring-red-500/20 shadow-sm'
                : 'bg-canvas-card border-border-subtle hover:bg-canvas-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary">Flag for Rejection</span>
              <AlertCircle
                className={`w-4 h-4 ${
                  action === 'reject' ? 'text-semantic-danger' : 'text-content-muted'
                }`}
              />
            </div>
            <p className="text-[11px] text-content-tertiary mt-1">
              Does not satisfy GitBook requirements or deliverable is broken.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setAction('flag_fraud')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              action === 'flag_fraud'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-canvas-card border-border-subtle hover:bg-canvas-hover'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-primary">Flag Fraud</span>
              <AlertCircle
                className={`w-4 h-4 ${
                  action === 'flag_fraud' ? 'text-amber-600' : 'text-content-muted'
                }`}
              />
            </div>
            <p className="text-[11px] text-content-tertiary mt-1">
              Stolen code, bot scripts, or deliberate bad faith submission.
            </p>
          </button>
        </div>

        {/* Hours Adjustment */}
        {action === 'pre_approve' && (
          <div className="p-4 rounded-xl bg-canvas-subtle border border-border-subtle space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-brand-orange" />
              Hours Granted
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-content-tertiary block mb-1">
                  Approved Hours (Claimed: {project.submittedHours} hrs)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={approvedHours}
                  onChange={(e) => setApprovedHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-xs font-mono font-bold text-content-primary focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="text-[11px] text-content-tertiary block mb-1">
                  Deflated / Deducted Hours (AI or Prior Submissions)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={deflatedHours}
                  onChange={(e) => setDeflatedHours(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-canvas-card text-xs font-mono text-content-secondary focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>
          </div>
        )}

        {/* Justification Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-content-primary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-brand-orange" />
              Decision Justification
            </label>
            <button
              type="button"
              onClick={copyJustification}
              className="text-[11px] text-brand-orange hover:underline inline-flex items-center gap-1 font-medium"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Write clear rationale for this decision..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas-card text-xs text-content-primary focus:outline-none focus:border-brand-orange leading-relaxed"
          />
        </div>

        {/* Internal Reviewer Notes */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-content-primary block">
            Internal Note (Logged to Cockpit Audit History)
          </label>
          <input
            type="text"
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Optional internal note for other reviewers..."
            className="w-full px-3.5 py-2 rounded-xl border border-border bg-canvas-card text-xs text-content-primary focus:outline-none focus:border-brand-orange"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitVerdict}
            className="px-6 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Recording Verdict...' : 'Submit Technical Verdict'}</span>
          </button>
        </div>
      </div>

      {/* Keyboard Shortcuts Reference */}
      <div className="p-4 rounded-xl bg-canvas-card border border-border-subtle shadow-sm">
        <h4 className="text-xs font-bold text-content-primary uppercase tracking-wider flex items-center gap-2 mb-3">
          <Keyboard className="w-4 h-4 text-brand-orange" />
          Reviewer Keyboard Shortcuts
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded bg-canvas-subtle border border-border-subtle flex items-center justify-between">
            <span className="text-content-secondary">Next Project</span>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas-card border border-border-subtle font-mono text-[11px] font-bold text-content-primary">
              N
            </kbd>
          </div>
          <div className="p-2 rounded bg-canvas-subtle border border-border-subtle flex items-center justify-between">
            <span className="text-content-secondary">Previous Project</span>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas-card border border-border-subtle font-mono text-[11px] font-bold text-content-primary">
              P
            </kbd>
          </div>
          <div className="p-2 rounded bg-canvas-subtle border border-border-subtle flex items-center justify-between">
            <span className="text-content-secondary">Notes Drawer</span>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas-card border border-border-subtle font-mono text-[11px] font-bold text-content-primary">
              S
            </kbd>
          </div>
          <div className="p-2 rounded bg-canvas-subtle border border-border-subtle flex items-center justify-between">
            <span className="text-content-secondary">Queue Return</span>
            <kbd className="px-1.5 py-0.5 rounded bg-canvas-card border border-border-subtle font-mono text-[11px] font-bold text-content-primary">
              Esc
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
