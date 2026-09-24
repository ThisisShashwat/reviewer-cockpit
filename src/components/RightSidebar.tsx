import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { submitCockpitVerdict } from '../lib/api';
import { CockpitProject, VerdictDetails } from '../lib/types';
import { formatCommitsSummary } from '../lib/utils';

interface RightSidebarProps {
  project: CockpitProject;
  onVerdictSubmitted: (verdict: VerdictDetails, updatedProject: CockpitProject) => void;
  onNextProject: () => void;
}

const JUSTIFICATION_CHIPS = [
  'Verified working code & demo',
  'Verified binary release asset',
  'Clean Manifest cross-check',
  'Tracked velocity realistic',
  'AI coding reduced by 2/3',
  'Deducted idle editor pauses',
  'Asset cap applied (max 25%)',
  'Resubmission delta verified',
];

export const RightSidebar: React.FC<RightSidebarProps> = ({
  project,
  onVerdictSubmitted,
  onNextProject,
}) => {
  const [action, setAction] = useState<'pre_approve' | 'reject' | 'flag_fraud'>('pre_approve');
  const [approvedHours, setApprovedHours] = useState<number>(project.submittedHours);
  const [applyAiReduction, setApplyAiReduction] = useState(false);
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [justificationText, setJustificationText] = useState('');
  const [publicFeedback, setPublicFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync state whenever project changes
  useEffect(() => {
    if (project.cockpitVerdict) {
      setAction(project.cockpitVerdict.action);
      setApprovedHours(project.cockpitVerdict.approvedHours);
      setJustificationText(project.cockpitVerdict.hoursJustification);
      setPublicFeedback(project.cockpitVerdict.publicFeedback);
    } else {
      setAction('pre_approve');
      setApprovedHours(project.submittedHours);
      setSelectedChips(['Verified working code & demo', 'Clean Manifest cross-check']);
      setJustificationText(
        `Software project verified. Delivering working functionality at ${project.codeUrl}. Tracked velocity matches Git commit history.`
      );
      setPublicFeedback('Great work! Your project meets all shipping criteria.');
    }
  }, [project.id]);

  // Handle AI reduction toggle (reduces 66% of AI time if known, or 20% estimated)
  const handleToggleAiReduction = (checked: boolean) => {
    setApplyAiReduction(checked);
    if (checked) {
      const reduction = Math.round(project.submittedHours * 0.25 * 10) / 10;
      setApprovedHours(Math.max(0, Math.round((project.submittedHours - reduction) * 10) / 10));
      if (!selectedChips.includes('AI coding reduced by 2/3')) {
        setSelectedChips((prev) => [...prev, 'AI coding reduced by 2/3']);
      }
    } else {
      setApprovedHours(project.submittedHours);
      setSelectedChips((prev) => prev.filter((c) => c !== 'AI coding reduced by 2/3'));
    }
  };

  const toggleChip = (chip: string) => {
    const exists = selectedChips.includes(chip);
    const updated = exists ? selectedChips.filter((c) => c !== chip) : [...selectedChips, chip];
    setSelectedChips(updated);

    // Auto-update justification summary
    if (!exists) {
      setJustificationText((prev) =>
        prev ? `${prev.trim()}\n• ${chip}` : `• ${chip}`
      );
    }
  };

  const deflatedHours = Math.max(0, Math.round((project.submittedHours - approvedHours) * 10) / 10);

  const handleSubmit = async () => {
    if (action === 'reject' && !justificationText.trim()) {
      toast.error('Rejection reason is required by GitBook guidelines.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCockpitVerdict({
        projectId: project.id,
        action,
        approvedHours: action === 'pre_approve' ? approvedHours : 0,
        deflatedHours,
        hoursJustification: justificationText.trim(),
        publicFeedback: publicFeedback.trim(),
        appliedChecklist: Object.fromEntries(selectedChips.map((c) => [c, true])),
        reviewerName: 'First-Pass Reviewer',
      });

      if (action === 'pre_approve') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
        });
        toast.success(`Pre-Approved for ${approvedHours}h!`, {
          description: 'Added to Admin Clipboard Desk. Advancing to next project...',
        });
      } else if (action === 'reject') {
        toast.error('Project Rejected', {
          description: 'Rejection logged with justification.',
        });
      } else {
        toast.warning('Flagged for Fraud Investigation', {
          description: 'Anomaly record generated for admin triage.',
        });
      }

      if (res.backupInfo?.created) {
        toast.success(`🛡️ Milestone reached (${res.backupInfo.milestone} prereviews completed)!`, {
          description: `Permanent backup saved: ${res.backupInfo.filename}`,
          duration: 6000,
        });
      }

      onVerdictSubmitted(res.verdict, res.project);
      setTimeout(() => onNextProject(), 400);
    } catch (err: any) {
      toast.error(err.message || 'Failed to record verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyClipboard = () => {
    const isDeflated = action === 'pre_approve' && (approvedHours < project.submittedHours || deflatedHours > 0);
    const verdictText = action === 'pre_approve'
      ? (isDeflated ? `Accepted (deflated from ${project.submittedHours} hrs to ${approvedHours} hrs)` : 'Accepted')
      : action === 'flag_fraud'
      ? 'Rejected (Fraud)'
      : 'Rejected';

    const applied = project.cockpitVerdict?.appliedChecklist || {};
    const expMap: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      highly_experienced: 'Highly Experienced / Pro',
    };
    const expText = applied.submitter_experience_level
      ? (expMap[applied.submitter_experience_level] || applied.submitter_experience_level)
      : 'Uncalibrated';

    const lines: string[] = [
      `Project: ${project.projectName || 'Unnamed'}`,
      `Hackatime ID: ${project.hackatimeId || project.id || 'N/A'}`,
      `Experience: ${expText}`,
      `Shipped: Yes`,
    ];

    let commitsSummary = applied.commits_summary;
    if (applied.code_commits_count !== undefined || applied.cosmetic_commits_count !== undefined) {
      commitsSummary = formatCommitsSummary(
        applied.code_commits_count || 0,
        applied.cosmetic_commits_count || 0,
        applied.boilerplate_commits_count || 0
      );
    } else if (!commitsSummary) {
      commitsSummary = '0 code related commits';
    } else {
      commitsSummary = commitsSummary
        .replace(/,\s*0 cosmetic commits?/gi, '')
        .replace(/,\s*1 cosmetic commits?/gi, '')
        .replace(/,\s*2 cosmetic commits?/gi, '')
        .replace(/,\s*0 boilerplate commits?/gi, '')
        .replace(/,\s*1 boilerplate commits?/gi, '')
        .replace(/,\s*2 boilerplate commits?/gi, '');
    }
    lines.push(`Commits: ${commitsSummary}`);

    lines.push(`Verdict: ${verdictText}`);

    if (justificationText.trim()) {
      lines.push('');
      lines.push(justificationText.trim());
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    toast.success('Formatted verdict copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-88 bg-rv-surface border-l border-rv-border flex flex-col shrink-0 overflow-y-auto select-none">
      {/* Verdict Header */}
      <div className="p-4 border-b border-rv-border bg-gradient-to-b from-rv-surface to-rv-surface2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-rv-text flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-rv-accent" />
            Verdict Desk
          </span>
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="text-[11px] text-rv-dim hover:text-rv-accent flex items-center gap-1 font-medium transition-colors"
            title="Copy justification to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Quick Copy'}</span>
          </button>
        </div>

        {/* 3 Main Action Decision Buttons */}
        <div className="grid grid-cols-3 gap-1.5 mt-3">
          <button
            type="button"
            onClick={() => setAction('pre_approve')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              action === 'pre_approve'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Pre-Approve</span>
          </button>

          <button
            type="button"
            onClick={() => setAction('reject')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              action === 'reject'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3'
            }`}
          >
            <XCircle className="w-4 h-4" />
            <span>Reject</span>
          </button>

          <button
            type="button"
            onClick={() => setAction('flag_fraud')}
            className={`py-2 px-1 rounded-lg text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
              action === 'flag_fraud'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text hover:bg-rv-surface3'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Flag Fraud</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs flex-1">
        {/* Hours Adjustment & Deflation Station */}
        {action === 'pre_approve' && (
          <div className="p-3 rounded-lg bg-rv-surface2 border border-rv-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-rv-text">Hours Calculation</span>
              <span className="text-[11px] font-mono text-rv-dim">
                Requested: {project.submittedHours}h
              </span>
            </div>

            {/* Approved Hours Input */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max={project.submittedHours * 2}
                value={approvedHours}
                onChange={(e) => setApprovedHours(Number(e.target.value))}
                className="w-24 bg-rv-bg border border-rv-border rounded-lg px-3 py-1.5 text-base font-bold font-mono text-rv-text text-center focus:outline-none focus:border-rv-accent"
              />
              <span className="text-xs font-medium text-rv-dim">Approved Hours</span>

              {deflatedHours > 0 && (
                <span className="ml-auto px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-mono text-[11px] font-semibold">
                  -{deflatedHours}h deflated
                </span>
              )}
            </div>

            {/* Quick AI Deflation Checkbox */}
            <label className="flex items-center gap-2 pt-1 border-t border-rv-border/50 cursor-pointer select-none text-[11px] text-rv-dim hover:text-rv-text">
              <input
                type="checkbox"
                checked={applyAiReduction}
                onChange={(e) => handleToggleAiReduction(e.target.checked)}
                className="rounded border-rv-border text-rv-accent focus:ring-0 cursor-pointer"
              />
              <span>Apply Hackatime AI reduction (credited at 1/3)</span>
            </label>
          </div>
        )}

        {/* GitBook Justification Chips */}
        <div>
          <label className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block mb-2">
            Standard Justification Checks
          </label>
          <div className="flex flex-wrap gap-1.5">
            {JUSTIFICATION_CHIPS.map((chip) => {
              const active = selectedChips.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => toggleChip(chip)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-rv-accent/20 border border-rv-accent text-rv-accent font-semibold'
                      : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text'
                  }`}
                >
                  {active ? '✓ ' : '+ '}
                  {chip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Justification Text */}
        <div>
          <label className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider flex items-center justify-between mb-1.5">
            <span>Justification & Technical Summary</span>
            <span className="text-[10px] text-rv-muted lowercase">required for spot-checks</span>
          </label>
          <textarea
            value={justificationText}
            onChange={(e) => setJustificationText(e.target.value)}
            rows={4}
            placeholder="Explain why hours were approved or why project was deflated/rejected..."
            className="w-full bg-rv-bg border border-rv-border rounded-lg p-2.5 text-xs text-rv-text placeholder:text-rv-muted focus:outline-none focus:border-rv-accent resize-none leading-relaxed"
          />
        </div>

        {/* Public Feedback for Submitter */}
        <div>
          <label className="text-[11px] font-semibold text-rv-muted uppercase tracking-wider block mb-1.5">
            Public Feedback to Submitter
          </label>
          <textarea
            value={publicFeedback}
            onChange={(e) => setPublicFeedback(e.target.value)}
            rows={2}
            placeholder="Positive encouragement or constructive critique..."
            className="w-full bg-rv-bg border border-rv-border rounded-lg p-2.5 text-xs text-rv-text placeholder:text-rv-muted focus:outline-none focus:border-rv-accent resize-none"
          />
        </div>
      </div>

      {/* Primary Submit Button */}
      <div className="p-4 border-t border-rv-border bg-rv-surface2/60">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleSubmit}
          className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
            action === 'pre_approve'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : action === 'reject'
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-amber-600 hover:bg-amber-500 text-white'
          } disabled:opacity-50`}
        >
          {isSubmitting ? (
            <span>Recording Verdict...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>
                {action === 'pre_approve'
                  ? `Pre-Approve (${approvedHours}h) & Next`
                  : action === 'reject'
                  ? 'Reject Project & Next'
                  : 'Flag Fraud & Next'}
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
