import React, { useState } from 'react';
import { 
  VerdictState, 
  VERDICT_REASON_CHIPS, 
  buildReviewerClipboardSummary 
} from '../lib/verdict';

interface VerdictPanelProps {
  recordId: string;
  projectTitle: string;
  submittedHours: string;
  verdict: VerdictState;
  onVerdictChange: (v: VerdictState) => void;
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({
  recordId,
  projectTitle,
  submittedHours,
  verdict,
  onVerdictChange,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleChip = (chip: string) => {
    const exists = verdict.selectedChips.includes(chip);
    onVerdictChange({
      ...verdict,
      selectedChips: exists
        ? verdict.selectedChips.filter((c) => c !== chip)
        : [...verdict.selectedChips, chip],
    });
  };

  const handleCopy = () => {
    const summary = buildReviewerClipboardSummary(
      recordId,
      projectTitle,
      submittedHours,
      verdict
    );
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-rv-bg p-6 space-y-5 select-text">
      
      {/* 3 Main Action Sub-Tabs matching Horizons VerdictPanel */}
      <div className="flex items-center gap-2 border-b border-rv-border pb-4">
        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'approve'
              ? 'bg-rv-green text-white shadow-sm'
              : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'approve' })}
        >
          Approve Project
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'adjust_hours'
              ? 'bg-rv-accent text-black font-bold shadow-sm'
              : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'adjust_hours' })}
        >
          Adjust Hours
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'needs_changes'
              ? 'bg-rv-blue text-white shadow-sm'
              : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'needs_changes' })}
        >
          Changes Needed (Pre-approval)
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'reject'
              ? 'bg-rv-red text-white shadow-sm'
              : 'bg-rv-surface2 border border-rv-border text-rv-dim hover:text-rv-text'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'reject' })}
        >
          Reject Project
        </button>
      </div>

      {/* Hours Adjustment Input (if Adjust Hours selected) */}
      {verdict.decision === 'adjust_hours' && (
        <div className="flex items-center justify-between p-3.5 bg-rv-surface border border-rv-border rounded-md">
          <div>
            <span className="text-[13px] font-semibold text-rv-text">Adjusted Approved Hours:</span>
            <div className="text-[11px] text-rv-dim">Original claimed: {submittedHours}h</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              value={verdict.approvedHours}
              onChange={(e) => onVerdictChange({ ...verdict, approvedHours: e.target.value })}
              className="w-24 bg-rv-surface2 border border-rv-border rounded px-3 py-1.5 font-mono text-[13px] text-rv-text focus:outline-none focus:border-rv-accent"
            />
            <span className="text-[12px] text-rv-dim font-medium">hours</span>
          </div>
        </div>
      )}

      {/* Justification Builder Box (Exact Horizons guidance text) */}
      <div className="rounded-md border border-rv-border px-4 py-3 text-[13px] text-rv-text leading-relaxed bg-rv-surface">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="m-0 text-rv-dim">
            Your review notes should cover key qualitative findings. Deliverables, commit consistency, and evidence are logged into the record.
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="shrink-0 rounded border border-rv-border px-2 py-0.5 text-[11px] text-rv-dim hover:text-rv-text hover:border-rv-accent transition-colors cursor-pointer"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        <ul className="list-disc pl-5 space-y-1.5 text-rv-dim text-[12px]">
          <li>What was built and whether it was tested and confirmed working.</li>
          <li>Notable deliverables (e.g. binaries, demo video, documentation quality) supporting scope.</li>
          <li>Commit count as evidence that scope is consistent with approved hours.</li>
          {showDetails && (
            <>
              <blockquote className="border-l-2 border-rv-border pl-2 my-1 italic text-rv-dim">
                "They had 4 commits over a 3 day period, and the playable demo was source code."
              </blockquote>
              <li>Any hour adjustments: what was deducted and why.</li>
              <li>Explain why high quality projects are high quality.</li>
            </>
          )}
        </ul>
      </div>

      {/* Quick Reason Chips */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-2 block">
          Audit Justification Chips
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(VERDICT_REASON_CHIPS[verdict.decision] || []).map((chip) => {
            const isSelected = verdict.selectedChips.includes(chip);
            return (
              <button
                key={chip}
                onClick={() => toggleChip(chip)}
                className={`text-[12px] px-2.5 py-1 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-rv-accent/15 text-rv-accent border-rv-accent/50 font-medium'
                    : 'bg-rv-surface2 text-rv-dim border-rv-border hover:text-rv-text hover:border-rv-accent'
                }`}
              >
                {isSelected ? '✓ ' : ''}{chip}
              </button>
            );
          })}
        </div>
      </div>

      {/* Textarea for Notes */}
      <div>
        <label className="text-[11px] uppercase tracking-wider text-rv-dim font-semibold mb-1.5 block">
          Reviewer Notes / Feedback to Submitter
        </label>
        <textarea
          value={verdict.customNotes}
          onChange={(e) => onVerdictChange({ ...verdict, customNotes: e.target.value })}
          placeholder="Describe what you reviewed: deliverables, platform tested, commit evidence, or reason for changes needed..."
          className="w-full bg-rv-surface border border-rv-border rounded-md p-3 text-rv-text font-inherit text-[13px] resize-vertical min-h-[100px] focus:outline-none focus:border-rv-accent"
        />
      </div>

      {/* Copy Summary Hand-off Box */}
      <div className="pt-2 border-t border-rv-border space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-wider text-rv-dim">
            Unified Clipboard Export
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-1.5 rounded-md bg-rv-green hover:opacity-90 text-white text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy Summary'}
          </button>
        </div>

        <pre className="p-3.5 rounded-md bg-rv-surface border border-rv-border text-[12px] font-mono text-rv-text whitespace-pre-wrap leading-relaxed select-all">
          {buildReviewerClipboardSummary(
            recordId,
            projectTitle,
            submittedHours,
            verdict
          )}
        </pre>
      </div>

    </div>
  );
};
