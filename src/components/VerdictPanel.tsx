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
    <div className="h-full overflow-y-auto bg-rv-surface p-6 space-y-5 select-text">
      
      {/* 3 Main Action Sub-Tabs matching Horizons VerdictPanel */}
      <div className="flex items-center gap-2 border-b border-rv-border pb-4 flex-wrap">
        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'approve'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-white border border-rv-border text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'approve' })}
        >
          Approve Project
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'adjust_hours'
              ? 'bg-amber-600 text-white font-bold shadow-sm'
              : 'bg-white border border-rv-border text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'adjust_hours' })}
        >
          Adjust Hours
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'needs_changes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-rv-border text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'needs_changes' })}
        >
          Changes Needed (Pre-approval)
        </button>

        <button
          className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all cursor-pointer ${
            verdict.decision === 'reject'
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-white border border-rv-border text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onVerdictChange({ ...verdict, decision: 'reject' })}
        >
          Reject Project
        </button>
      </div>

      {/* Hours Adjustment Input (if Adjust Hours selected) */}
      {verdict.decision === 'adjust_hours' && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-md">
          <div>
            <span className="text-[13px] font-semibold text-amber-900">Adjusted Approved Hours:</span>
            <div className="text-[11px] text-amber-700">Original claimed: {submittedHours}h</div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0"
              value={verdict.approvedHours}
              onChange={(e) => onVerdictChange({ ...verdict, approvedHours: e.target.value })}
              className="w-24 bg-white border border-amber-300 rounded px-3 py-1.5 font-mono text-[13px] text-gray-900 focus:outline-none focus:border-amber-500 font-bold"
            />
            <span className="text-[12px] text-amber-800 font-medium">hours</span>
          </div>
        </div>
      )}

      {/* Justification Guidance Box (Exact Horizons text) */}
      <div className="rounded-md border border-rv-border px-4 py-3 text-[13px] text-rv-text leading-relaxed bg-rv-bg">
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className="m-0 text-gray-700">
            Your review notes should cover key qualitative findings. Deliverables, commit consistency, and evidence are logged into the record.
          </p>
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="shrink-0 rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        </div>

        <ul className="list-disc pl-5 space-y-1 text-gray-600 text-[12px]">
          <li>What was built and whether it was tested and confirmed working.</li>
          <li>Notable deliverables (e.g. binaries, demo video, documentation quality) supporting scope.</li>
          <li>Commit count as evidence that scope is consistent with approved hours.</li>
          {showDetails && (
            <>
              <blockquote className="border-l-2 border-gray-400 pl-2 my-1 italic text-gray-500">
                "They had 4 commits over a 3 day period, and the deliverable binary was tested."
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
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-gray-600 border-rv-border hover:text-gray-900 hover:border-gray-400'
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
          className="w-full bg-white border border-rv-border rounded-md p-3 text-rv-text font-inherit text-[13px] resize-vertical min-h-[100px] focus:outline-none focus:border-rv-blue"
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
            className="px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            {copied ? '✓ Copied to Clipboard!' : '📋 Copy Summary'}
          </button>
        </div>

        <pre className="p-3.5 rounded-md bg-rv-bg border border-rv-border text-[12px] font-mono text-gray-800 whitespace-pre-wrap leading-relaxed select-all">
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
