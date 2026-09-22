/**
 * Fast Verdict Station & Clipboard Hand-off Utility
 * 
 * Generates audit-compliant review summaries with 1-click copy for the reviewer
 * to paste back into their primary dashboard or Airtable.
 */

export type DecisionType = 'approve' | 'adjust_hours' | 'needs_changes' | 'reject';

export interface VerdictState {
  decision: DecisionType;
  approvedHours: string;
  selectedChips: string[];
  customNotes: string;
}

export const VERDICT_REASON_CHIPS: Record<DecisionType, string[]> = {
  approve: [
    'Clean iterative commit history',
    'Verified playable demo works smoothly',
    'Hackatime heartbeats match code changes',
    'High quality documentation & README',
    'Hardware KiCad / STEP files validated'
  ],
  adjust_hours: [
    'Hours adjusted down to match active Hackatime heartbeat window',
    'Deducted time spent on non-project files / tutorial setup',
    'Partial credit granted based on code complexity',
    'Project name divergence between submission and tracker'
  ],
  needs_changes: [
    'Playable URL is identical to GitHub source code repo (Criterion #10)',
    'CLI / Python script requires screen recording demo video',
    'Timelapse link inaccessible or corrupted',
    'Streamlit hosting requires pre-approval or alternative deploy'
  ],
  reject: [
    'Repository is a clone/fork of an existing template without original code',
    'Zero commit progression / massive single external code import',
    'No verifiable coding activity in Hackatime for this project',
    'Inaccessible source repository and non-functional playable demo'
  ]
};

/**
 * Builds the structured markdown review text for copy-pasting back into the reviewer dashboard
 */
export function buildReviewerClipboardSummary(
  recordId: string,
  projectName: string,
  claimedHours: string,
  state: VerdictState
): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const decisionHeader = {
    approve: '✅ APPROVED',
    adjust_hours: '⚠️ APPROVED WITH ADJUSTED HOURS',
    needs_changes: '🔄 CHANGES REQUESTED / PRE-APPROVAL',
    reject: '❌ REJECTED'
  }[state.decision];

  let text = `=== REVIEW SUMMARY: ${projectName || recordId || 'SUBMISSION'} ===\n`;
  text += `Decision: ${decisionHeader}\n`;
  text += `Date: ${dateStr}\n`;
  
  if (state.decision === 'approve') {
    text += `Granted Hours: ${state.approvedHours || claimedHours}h (Claimed: ${claimedHours}h)\n`;
  } else if (state.decision === 'adjust_hours') {
    text += `Adjusted Hours: ${state.approvedHours}h (Claimed: ${claimedHours}h)\n`;
  } else {
    text += `Claimed Hours: ${claimedHours}h\n`;
  }

  if (state.selectedChips.length > 0) {
    text += `\nKey Findings:\n`;
    state.selectedChips.forEach(chip => {
      text += `• ${chip}\n`;
    });
  }

  if (state.customNotes.trim()) {
    text += `\nReviewer Notes:\n${state.customNotes.trim()}\n`;
  }

  text += `=========================================`;
  return text;
}
