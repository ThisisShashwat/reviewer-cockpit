import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  ShieldCheck,
  AlertCircle,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Bot,
  Check,
  X,
  ShieldAlert,
  GitCommit,
  FolderGit2,
  Globe,
  Activity,
  History,
  UserCheck,
  Sparkles,
  Award,
  Zap,
  Lock,
  MessageSquare,
  Search,
  Square,
  CheckSquare,
  FileText,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitProject, VerdictDetails, GitHubRepoData } from '../../lib/types';
import { submitCockpitVerdict, markProjectCompletedPreApproved } from '../../lib/api';
import { decodeHtmlEntities, summarizeCommits, formatCommitsSummary } from '../../lib/utils';
import { PassFailControl } from '../common/PassFailControl';
import { MultiOptionSelector, SelectorOption } from '../common/MultiOptionSelector';

interface VerdictDeskStageProps {
  project: CockpitProject;
  verdict?: VerdictDetails;
  gitHubData?: Partial<GitHubRepoData>;
  reviewChecklist?: Record<string, any>;
  onToggleChecklist?: (key: string, status?: any) => void;
  onVerdictSubmitted?: (verdict: VerdictDetails, updatedProject: CockpitProject) => void;
  onCompletePreApproval?: (project: CockpitProject) => void;
  isReadOnly?: boolean;
}

const CHECKLIST_LABELS: Record<string, string> = {
  // Stage 1 History & Double Dip
  stage1_halceon_reviewed: 'Halceon Cross-YSWS Ships & Archives Inspected',
  stage1_live_reviewed: 'Live Submissions History Audited',
  zero_progress_blocked: 'Zero Progress Double-Dip (Re-submission without substantial additions)',
  prior_ships_reviewed: 'Prior Ships Double-Dip Audit',
  // Stage 2 Deliverables
  shipped_name_valid: 'Project Name (Missing or insufficient project title)',
  shipped_code_valid: 'Source Code Repository (Missing or invalid GitHub repository URL)',
  shipped_desc_valid: 'Project Description (Missing or insufficient project description)',
  shipped_screenshot_valid: 'Deliverable Screenshot (Missing deliverable image screenshot)',
  shipped_readme_status: 'Repository README (Missing setup instructions or documentation)',
  shipped_readme_valid: 'Repository README (Missing setup instructions or documentation)',
  // Stage 3 Playable Demo
  shipped_playable_status: 'Playable Demo (Missing working playable demo, release binary, or video)',
  shipped_playable_valid: 'Playable Demo (Missing working playable demo, release binary, or video)',
  shipped_host_compliant: 'Host Compliance (Prohibited ephemeral host: Streamlit / Replit / Drive)',
  // Stage 4 Telemetry
  telemetry_heartbeats_status: 'Hackatime Telemetry (Missing or unverifiable coding heartbeats)',
  telemetry_heartbeats_verified: 'Hackatime Telemetry (Missing or unverifiable coding heartbeats)',
  hackatime_sanity: 'Hackatime Telemetry Sanity',
  // Stage 5 Commits & AI
  stage1_double_dip_checked: 'Archive vs Code Progression (No genuine additions beyond prior archive)',
  git_progression_status: 'Git Commit Progression (Code dump or lack of incremental progress)',
  git_progression_verified: 'Git Commit Progression (Code dump or lack of incremental progress)',
  commits_diffs: 'Git Commit Progression (Code dump or lack of incremental progress)',
  code_churn_reviewed: 'AI Forensics & Code Churn (Excessive uninspected AI code churn)',
  flag_monolithic_dump: 'Monolithic Initial Dump (Single bulk commit without iterative progression)',
  flag_deleted_origin_files: 'Deleted Origin Files (Template or tutorial origin traces purged in git history)',
  flag_tutorial_plagiarized: 'Plagiarism / Tutorial Clone (Matches existing tutorial or external project)',
  plagiarism_google_cleared: 'Plagiarism Web Search: Google check completed',
  plagiarism_youtube_cleared: 'Plagiarism Web Search: YouTube check completed',
  plagiarism_github_cleared: 'Plagiarism Web Search: GitHub check completed',
  // Stage 6 Submitter Portfolio
  submitter_experience_level: 'Submitter Experience Calibration (Beginner / Intermediate / Advanced / Pro)',
};

const VERDICT_README_OPTIONS: SelectorOption<'pass' | 'ai_generated' | 'low_quality' | 'fail'>[] = [
  { id: 'pass', label: 'Pass (Detailed)', color: 'emerald', icon: Check },
  { id: 'ai_generated', label: 'AI-Generated', color: 'purple', icon: Bot },
  { id: 'low_quality', label: 'Low Quality', color: 'amber', icon: AlertTriangle },
  { id: 'fail', label: 'Fail', color: 'rose', icon: X },
];

const VERDICT_EXPERIENCE_OPTIONS: SelectorOption<'beginner' | 'intermediate' | 'advanced' | 'highly_experienced'>[] = [
  { id: 'beginner', label: 'Beginner', color: 'emerald', icon: Sparkles },
  { id: 'intermediate', label: 'Intermediate', color: 'blue', icon: Check },
  { id: 'advanced', label: 'Advanced', color: 'purple', icon: Zap },
  { id: 'highly_experienced', label: 'Highly Experienced / Pro', color: 'amber', icon: Award },
];

const VERDICT_PLAYABLE_OPTIONS: SelectorOption<'pass' | 'needs_video' | 'disallowed_host' | 'broken' | 'fail'>[] = [
  { id: 'pass', label: 'Pass (Live)', color: 'emerald', icon: Check },
  { id: 'needs_video', label: 'Needs Video', color: 'amber', icon: AlertTriangle },
  { id: 'disallowed_host', label: 'Disallowed Host', color: 'rose', icon: ShieldAlert },
  { id: 'broken', label: 'Broken', color: 'rose', icon: AlertTriangle },
  { id: 'fail', label: 'Fail', color: 'rose', icon: X },
];

const VERDICT_TELEMETRY_OPTIONS: SelectorOption<'pass' | 'missing' | 'suspicious'>[] = [
  { id: 'pass', label: 'Pass (Verified)', color: 'emerald', icon: Check },
  { id: 'missing', label: 'Missing', color: 'amber', icon: AlertTriangle },
  { id: 'suspicious', label: 'Suspicious', color: 'rose', icon: X },
];

const VERDICT_GIT_OPTIONS: SelectorOption<'pass' | 'deflate' | 'ai_dump' | 'fail'>[] = [
  { id: 'pass', label: 'Pass (Authentic)', color: 'emerald', icon: Check },
  { id: 'deflate', label: 'Pass w/ Deflation', color: 'amber', icon: AlertTriangle },
  { id: 'ai_dump', label: 'AI Coding', color: 'purple', icon: Bot },
  { id: 'fail', label: 'Fail', color: 'rose', icon: X },
];

export const VerdictDeskStage: React.FC<VerdictDeskStageProps> = ({
  project,
  verdict,
  gitHubData,
  reviewChecklist = {},
  onToggleChecklist,
  onVerdictSubmitted,
  onCompletePreApproval,
  isReadOnly = false,
}) => {
  const claimedHours = project.submittedHours || 0;

  // Compute commits breakdown: n code related commits, m cosmetic commits
  const commitsSummary = React.useMemo(() => {
    if (reviewChecklist['code_commits_count'] !== undefined) {
      return formatCommitsSummary(
        reviewChecklist['code_commits_count'] || 0,
        reviewChecklist['cosmetic_commits_count'] || 0,
        reviewChecklist['boilerplate_commits_count'] || 0
      );
    }
    if (reviewChecklist['commits_summary']) {
      return reviewChecklist['commits_summary']
        .replace(/,\s*0 cosmetic commits?/gi, '')
        .replace(/,\s*1 cosmetic commits?/gi, '')
        .replace(/,\s*2 cosmetic commits?/gi, '')
        .replace(/,\s*0 boilerplate commits?/gi, '')
        .replace(/,\s*1 boilerplate commits?/gi, '')
        .replace(/,\s*2 boilerplate commits?/gi, '');
    }
    const commits = gitHubData?.commits || [];
    return summarizeCommits(commits).summaryText;
  }, [gitHubData?.commits, reviewChecklist]);

  // Keep reviewChecklist synced with commit summary
  useEffect(() => {
    if (gitHubData?.commits && gitHubData.commits.length > 0) {
      const summary = summarizeCommits(gitHubData.commits);
      if (reviewChecklist['commits_summary'] !== summary.summaryText) {
        onToggleChecklist?.('commits_summary', summary.summaryText);
        onToggleChecklist?.('code_commits_count', summary.codeCount);
        onToggleChecklist?.('cosmetic_commits_count', summary.cosmeticCount);
        if (summary.boilerplateCount > 0) {
          onToggleChecklist?.('boilerplate_commits_count', summary.boilerplateCount);
        }
      }
    }
  }, [gitHubData?.commits, onToggleChecklist, reviewChecklist]);

  const failedKeys = Object.entries(reviewChecklist)
    .filter(([k, v]) => {
      if (k === 'flag_tutorial_plagiarized' || k === 'flag_monolithic_dump' || k === 'flag_deleted_origin_files') return v === true;
      if (k.startsWith('flag_') || k.startsWith('note_') || k.endsWith('_status') || k === 'submitter_experience_level') return false;
      return v === false || v === 'fail' || v === 'disallowed_host' || v === 'broken';
    })
    .map(([k]) => k);

  const passedCount = Object.entries(reviewChecklist).filter(([k, v]) => {
    if (k.startsWith('flag_') || k.startsWith('note_') || k.endsWith('_status')) return false;
    if (k === 'submitter_experience_level') return !!v;
    return v === true || v === 'pass' || v === 'ai_generated' || v === 'deflate';
  }).length;
  const failedCount = failedKeys.length;

  const defaultAction = verdict?.action || (failedCount > 0 ? 'reject' : 'pre_approve');
  const defaultApprovedHours =
    verdict?.approvedHours ?? (failedCount > 0 ? 0 : claimedHours);
  const defaultDeflatedHours =
    verdict?.deflatedHours ?? Math.max(0, Math.round((claimedHours - defaultApprovedHours) * 10) / 10);

  // Bullet points generator: only clean criteria names, NO duplicated manual notes
  const getRejectionBulletPoints = () => {
    const points: string[] = [];

    // Stage 1
    if (reviewChecklist['stage1_double_dip_checked'] === false || reviewChecklist['zero_progress_blocked'] === true) {
      points.push('- Double-Dip / Archive Progression: Insufficient new progress beyond archive baseline');
    }

    // Stage 2
    if (reviewChecklist['shipped_name_valid'] === false) {
      points.push('- Project Name: Missing or insufficient project title');
    }
    if (reviewChecklist['shipped_code_valid'] === false) {
      points.push('- Source Code Repository: Missing or invalid public GitHub repository URL');
    }
    if (reviewChecklist['shipped_desc_valid'] === false) {
      points.push('- Project Description: Missing or insufficient project description');
    }
    if (reviewChecklist['shipped_screenshot_valid'] === false) {
      points.push('- Deliverable Screenshot: Missing deliverable screenshot');
    }
    if (reviewChecklist['shipped_readme_status'] === 'fail' || reviewChecklist['shipped_readme_valid'] === false) {
      points.push('- Repository README: Missing or broken repository documentation');
    } else if (reviewChecklist['shipped_readme_status'] === 'low_quality') {
      points.push('- Repository README: Low quality or sparse documentation');
    } else if (reviewChecklist['shipped_readme_status'] === 'ai_generated') {
      points.push('- Repository README: AI-generated boilerplate');
    }

    // Stage 3 Playable Demo
    if (reviewChecklist['shipped_playable_status'] === 'disallowed_host' || reviewChecklist['shipped_host_compliant'] === false) {
      points.push('- Playable Demo: Disallowed Ephemeral Host (Streamlit, Replit, or Drive)');
    } else if (reviewChecklist['shipped_playable_status'] === 'broken') {
      points.push('- Playable Demo: Application is broken or crashing');
    } else if (reviewChecklist['shipped_playable_status'] === 'fail' || reviewChecklist['shipped_playable_valid'] === false) {
      points.push('- Playable Demo: Missing or inaccessible deliverable');
    } else if (reviewChecklist['shipped_playable_status'] === 'needs_video') {
      points.push('- Playable Demo: Video proof required');
    }

    // Stage 4 Telemetry
    if (reviewChecklist['telemetry_heartbeats_status'] === 'missing') {
      points.push('- Hackatime Telemetry: Missing telemetry heartbeats');
    } else if (reviewChecklist['telemetry_heartbeats_status'] === 'suspicious' || reviewChecklist['telemetry_heartbeats_verified'] === false || reviewChecklist['hackatime_sanity'] === false) {
      points.push('- Hackatime Telemetry: Suspicious coding heartbeats');
    }

    // Stage 5 Git Commits Progression & Forensics
    if (reviewChecklist['flag_monolithic_dump'] || reviewChecklist['git_progression_status'] === 'ai_dump') {
      points.push('- Git Commit Progression: AI coding');
    } else if (reviewChecklist['git_progression_status'] === 'fail' || reviewChecklist['commits_diffs'] === false || reviewChecklist['git_progression_verified'] === false) {
      points.push('- Git Commit Progression: Zero progress or broken git history');
    } else if (reviewChecklist['git_progression_status'] === 'deflate') {
      points.push('- Git Commit Progression: Low incremental progress');
    }
    if (reviewChecklist['flag_deleted_origin_files']) {
      points.push('- Git Commit Progression: Deleted origin files');
    }
    if (reviewChecklist['flag_tutorial_plagiarized'] || reviewChecklist['note_plagiarism_match']) {
      points.push('- Plagiarism / Tutorial Clone: Submission matches existing tutorial or external codebase');
    }

    return points;
  };

  // Extracts all manual input comments typed by the reviewer across audit checklists
  const getManualComments = () => {
    const comments: string[] = [];
    const noteKeys = [
      'note_shipped_readme',
      'note_shipped_playable',
      'note_telemetry_heartbeats',
      'note_git_progression',
      'note_plagiarism_match',
    ];
    noteKeys.forEach((key) => {
      const val = reviewChecklist[key];
      if (typeof val === 'string' && val.trim() && !comments.includes(val.trim())) {
        comments.push(val.trim());
      }
    });
    Object.entries(reviewChecklist).forEach(([k, v]) => {
      if (k.startsWith('note_') && !noteKeys.includes(k) && typeof v === 'string' && v.trim() && !comments.includes(v.trim())) {
        comments.push(v.trim());
      }
    });
    return comments;
  };

  const handleAutoPopulateJustification = () => {
    const comments = getManualComments();
    if (comments.length > 0) {
      setHoursJustification(comments.join('\n\n'));
      toast.success('Populated with your manual audit comments');
    } else {
      toast.info('No manual comments were typed during the audit');
    }
  };

  const handleAutoPopulateFeedback = () => {
    const comments = getManualComments();
    if (comments.length > 0) {
      setPublicFeedback(comments.join('\n\n'));
      toast.success('Populated public feedback with your manual audit comments');
    } else {
      toast.info('No manual comments were typed during the audit');
    }
  };

  const [action, setAction] = useState<'pre_approve' | 'reject' | 'flag_fraud'>(defaultAction);
  const [approvedHours, setApprovedHours] = useState<number>(defaultApprovedHours);
  const [deflatedHours, setDeflatedHours] = useState<number>(defaultDeflatedHours);
  // Starts completely empty unless an existing verdict had saved text
  const [hoursJustification, setHoursJustification] = useState<string>(verdict?.hoursJustification || '');
  const [publicFeedback, setPublicFeedback] = useState<string>(verdict?.publicFeedback || '');
  const [internalNotes, setInternalNotes] = useState<string>(verdict?.internalNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If reviewer navigates here and there are failed checks, and no saved verdict existed, default action to reject
  useEffect(() => {
    if (!verdict && failedCount > 0) {
      setAction('reject');
      setApprovedHours(0);
      setDeflatedHours(claimedHours);
    }
  }, [failedCount, verdict]);

  // LIVE BIDIRECTIONAL HOURS CALCULATION
  const handleApprovedHoursChange = (rawStr: string) => {
    if (rawStr === '') {
      setApprovedHours(0);
      setDeflatedHours(claimedHours);
      return;
    }
    const val = parseFloat(rawStr);
    const safeApproved = isNaN(val) ? 0 : val;
    setApprovedHours(safeApproved);
    const autoDeflated = Math.max(0, Math.round((claimedHours - safeApproved) * 10) / 10);
    setDeflatedHours(autoDeflated);
  };

  const handleDeflatedHoursChange = (rawStr: string) => {
    if (rawStr === '') {
      setDeflatedHours(0);
      setApprovedHours(claimedHours);
      return;
    }
    const val = parseFloat(rawStr);
    const safeDeflated = isNaN(val) ? 0 : val;
    setDeflatedHours(safeDeflated);
    const autoApproved = Math.max(0, Math.round((claimedHours - safeDeflated) * 10) / 10);
    setApprovedHours(autoApproved);
  };

  const handleApplyFailedToJustification = () => {
    setAction('reject');
    setApprovedHours(0);
    setDeflatedHours(claimedHours);
    const comments = getManualComments();
    if (comments.length > 0) {
      setHoursJustification(comments.join('\n\n'));
      setPublicFeedback(comments.join('\n\n'));
      toast.success('Populated internal justification and public feedback with your comments');
    } else {
      toast.success('Applied rejection action and 0 hours');
    }
  };

  const handleApplyAiDeflation = () => {
    const half = Math.round((claimedHours * 0.5) * 10) / 10;
    setDeflatedHours(half);
    setApprovedHours(Math.max(0, Math.round((claimedHours - half) * 10) / 10));
    const aiNote = 'Deducted 50% claimed hours due to heavy unedited AI generation / prompt dumps per YSWS guidelines.';
    if (!hoursJustification.includes('AI generation')) {
      setHoursJustification((prev) => (prev ? `${prev}\n\n[AI Deflation]: ${aiNote}` : `[AI Deflation]: ${aiNote}`));
    }
    if (!publicFeedback.includes('AI generation')) {
      setPublicFeedback((prev) => (prev ? `${prev}\n\n${aiNote}` : aiNote));
    }
    toast.success(`Applied 50% AI deflation (-${half} hrs)`);
  };

  const isAiFlagged =
    reviewChecklist['flag_ai_generated'] === true ||
    reviewChecklist['shipped_readme_status'] === 'ai_generated' ||
    reviewChecklist['shipped_code_status'] === 'ai_code' ||
    reviewChecklist['git_progression_status'] === 'ai_dump';

  const isDeflationNeeded =
    reviewChecklist['flag_deflation_needed'] === true ||
    reviewChecklist['git_progression_status'] === 'deflate';

  const handleApplyDeflation = () => {
    const deduction = Math.round((claimedHours * 0.3) * 10) / 10;
    setDeflatedHours(deduction);
    setApprovedHours(Math.max(0, Math.round((claimedHours - deduction) * 10) / 10));
    const note = `Deducted ${deduction} hrs due to low incremental progress and boilerplate overhead identified during git progression audit.`;
    if (!hoursJustification.includes('incremental progress')) {
      setHoursJustification((prev) => (prev ? `${prev}\n\n[Git Deflation]: ${note}` : `[Git Deflation]: ${note}`));
    }
    if (!publicFeedback.includes('incremental progress')) {
      setPublicFeedback((prev) => (prev ? `${prev}\n\n${note}` : note));
    }
    toast.success(`Applied deflation (-${deduction} hrs)`);
  };

  const handleAddTagToNotes = (tag: string) => {
    setInternalNotes((prev) => {
      const cleanPrev = prev.trim();
      if (!cleanPrev) return `[${tag}]`;
      if (cleanPrev.includes(`[${tag}]`)) return cleanPrev;
      return `${cleanPrev}\n[${tag}]`;
    });
  };

  // CHECKLIST CURRENT STATUSES & MUTATION HANDLERS
  const currentReadmeStatus: 'pass' | 'ai_generated' | 'low_quality' | 'fail' | undefined =
    reviewChecklist['shipped_readme_status'] ||
    (reviewChecklist['shipped_readme_valid'] === true
      ? 'pass'
      : reviewChecklist['shipped_readme_valid'] === false
      ? 'fail'
      : undefined);

  const currentPlayableStatus: 'pass' | 'needs_video' | 'disallowed_host' | 'broken' | 'fail' | undefined =
    reviewChecklist['shipped_playable_status'] ||
    (reviewChecklist['shipped_playable_valid'] === true
      ? 'pass'
      : reviewChecklist['shipped_playable_valid'] === false
      ? reviewChecklist['shipped_host_compliant'] === false
        ? 'disallowed_host'
        : 'fail'
      : undefined);

  const currentTelemetryStatus: 'pass' | 'missing' | 'suspicious' | undefined =
    reviewChecklist['telemetry_heartbeats_status'] ||
    (reviewChecklist['telemetry_heartbeats_verified'] === true
      ? 'pass'
      : reviewChecklist['telemetry_heartbeats_verified'] === false
      ? 'suspicious'
      : undefined);

  const currentGitStatus: 'pass' | 'deflate' | 'ai_dump' | 'fail' | undefined =
    reviewChecklist['git_progression_status'] ||
    (reviewChecklist['commits_diffs'] === true
      ? 'pass'
      : reviewChecklist['commits_diffs'] === false
      ? 'fail'
      : undefined);

  const handleReadmeChange = (val: 'pass' | 'ai_generated' | 'low_quality' | 'fail') => {
    onToggleChecklist?.('shipped_readme_status', val);
    if (val === 'pass') {
      onToggleChecklist?.('shipped_readme_valid', true);
    } else if (val === 'ai_generated') {
      onToggleChecklist?.('shipped_readme_valid', true);
      onToggleChecklist?.('flag_ai_generated', true);
    } else if (val === 'low_quality') {
      onToggleChecklist?.('shipped_readme_valid', false);
    } else if (val === 'fail') {
      onToggleChecklist?.('shipped_readme_valid', false);
    }
  };

  const handlePlayableChange = (val: 'pass' | 'needs_video' | 'disallowed_host' | 'broken' | 'fail') => {
    onToggleChecklist?.('shipped_playable_status', val);
    if (val === 'pass' || val === 'needs_video') {
      onToggleChecklist?.('shipped_playable_valid', true);
      onToggleChecklist?.('shipped_host_compliant', true);
    } else if (val === 'disallowed_host') {
      onToggleChecklist?.('shipped_playable_valid', false);
      onToggleChecklist?.('shipped_host_compliant', false);
    } else if (val === 'broken') {
      onToggleChecklist?.('shipped_playable_valid', false);
    } else if (val === 'fail') {
      onToggleChecklist?.('shipped_playable_valid', false);
    }
  };

  const handleTelemetryChange = (val: 'pass' | 'missing' | 'suspicious') => {
    onToggleChecklist?.('telemetry_heartbeats_status', val);
    if (val === 'pass') {
      onToggleChecklist?.('telemetry_heartbeats_verified', true);
      onToggleChecklist?.('hackatime_sanity', true);
    } else if (val === 'missing' || val === 'suspicious') {
      onToggleChecklist?.('telemetry_heartbeats_verified', false);
      onToggleChecklist?.('hackatime_sanity', false);
    }
  };

  const handleGitProgressionChange = (val: 'pass' | 'deflate' | 'ai_dump' | 'fail') => {
    onToggleChecklist?.('git_progression_status', val);
    if (val === 'pass') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
    } else if (val === 'deflate') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
      onToggleChecklist?.('flag_deflation_needed', true);
    } else if (val === 'ai_dump') {
      onToggleChecklist?.('commits_diffs', true);
      onToggleChecklist?.('git_progression_verified', true);
      onToggleChecklist?.('flag_ai_generated', true);
    } else if (val === 'fail') {
      onToggleChecklist?.('commits_diffs', false);
      onToggleChecklist?.('git_progression_verified', false);
    }
  };

  const handleSubmitVerdict = async () => {
    setIsSubmitting(true);
    try {
      const checklistNotes: Record<string, string> = {};
      Object.entries(reviewChecklist).forEach(([k, v]) => {
        if (k.startsWith('note_') && typeof v === 'string' && v.trim()) {
          checklistNotes[k] = v.trim();
        }
      });

      const payload: VerdictDetails = {
        action,
        approvedHours: action === 'reject' || action === 'flag_fraud' ? 0 : approvedHours,
        deflatedHours,
        hoursJustification: hoursJustification.trim(),
        publicFeedback: publicFeedback.trim(),
        internalNotes: internalNotes.trim(),
        appliedChecklist: reviewChecklist,
        checklistNotes,
        reviewerName: 'Reviewer',
        decidedAt: new Date().toISOString(),
      };

      const res = await submitCockpitVerdict({
        projectId: project.id,
        action,
        approvedHours: action === 'reject' || action === 'flag_fraud' ? 0 : approvedHours,
        deflatedHours,
        hoursJustification: hoursJustification.trim(),
        publicFeedback: publicFeedback.trim(),
        internalNotes: internalNotes.trim(),
        appliedChecklist: reviewChecklist,
        checklistNotes,
        reviewerName: 'Reviewer',
      });

      if (onVerdictSubmitted) {
        onVerdictSubmitted(payload, res.project);
      }
      toast.success(
        action === 'pre_approve'
          ? `Pre-approved ${approvedHours} hrs for ${decodeHtmlEntities(project.projectName)}`
          : `Verdict submitted for ${decodeHtmlEntities(project.projectName)}`
      );
      if (res.backupInfo?.created) {
        toast.success(`🛡️ Milestone reached (${res.backupInfo.milestone} prereviews completed)!`, {
          description: `Permanent backup saved: ${res.backupInfo.filename}`,
          duration: 6000,
        });
      }
    } catch {
      toast.error('Failed to submit verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isCompleting, setIsCompleting] = useState(false);
  const [ledgerCopied, setLedgerCopied] = useState(false);

  const handleCompletePreApprovalAction = async () => {
    setIsCompleting(true);
    try {
      const res = await markProjectCompletedPreApproved(project.id);
      if (res && res.project) {
        toast.success(`Project ${decodeHtmlEntities(project.projectName)} marked as Completed Pre-Approved!`);
        if (onCompletePreApproval) {
          onCompletePreApproval(res.project);
        }
      }
    } catch (e: any) {
      toast.error('Failed to complete pre-approval: ' + (e.message || 'Unknown error'));
    } finally {
      setIsCompleting(false);
    }
  };

  const copyPublicFeedback = () => {
    navigator.clipboard.writeText(publicFeedback);
    toast.success('Public submitter feedback copied to clipboard');
  };

  const generateHumanReadableLedger = () => {
    const lines: string[] = [];

    // Project Name
    lines.push(`Project: ${decodeHtmlEntities(project.projectName || 'Unnamed')}`);

    // Hackatime ID
    lines.push(`Hackatime ID: ${project.hackatimeId || project.id || 'N/A'}`);

    // Experience
    const expMap: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      highly_experienced: 'Highly Experienced / Pro',
    };
    const currentExp = reviewChecklist['submitter_experience_level'];
    const expText = currentExp ? (expMap[currentExp] || currentExp) : 'Uncalibrated';
    lines.push(`Experience: ${expText}`);

    // Shipped: Yes (if all the checklists related to shipped are pass, else reason)
    const shippedFailures: string[] = [];
    if (reviewChecklist['shipped_name_valid'] === false) shippedFailures.push('Missing project title');
    if (reviewChecklist['shipped_code_valid'] === false) shippedFailures.push('Missing GitHub repository');
    if (reviewChecklist['shipped_desc_valid'] === false) shippedFailures.push('Missing description');
    if (reviewChecklist['shipped_screenshot_valid'] === false) shippedFailures.push('Missing deliverable screenshot');

    if (reviewChecklist['shipped_readme_status'] === 'fail' || reviewChecklist['shipped_readme_valid'] === false) {
      shippedFailures.push('Missing README');
    } else if (reviewChecklist['shipped_readme_status'] === 'low_quality') {
      shippedFailures.push('Low quality README');
    } else if (reviewChecklist['shipped_readme_status'] === 'ai_generated') {
      shippedFailures.push('AI-generated boilerplate README');
    }

    if (reviewChecklist['shipped_playable_status'] === 'disallowed_host' || reviewChecklist['shipped_host_compliant'] === false) {
      shippedFailures.push('Disallowed host: Streamlit/Replit/Drive');
    } else if (reviewChecklist['shipped_playable_status'] === 'broken') {
      shippedFailures.push('Playable demo broken/crashing');
    } else if (reviewChecklist['shipped_playable_status'] === 'fail' || reviewChecklist['shipped_playable_valid'] === false) {
      shippedFailures.push('Missing playable demo');
    } else if (reviewChecklist['shipped_playable_status'] === 'needs_video') {
      shippedFailures.push('Video proof required');
    }

    if (shippedFailures.length === 0) {
      lines.push('Shipped: Yes');
    } else {
      lines.push(`Shipped: No (${shippedFailures.join(', ')})`);
    }

    // Commits breakdown (directly after Shipped)
    lines.push(`Commits: ${commitsSummary}`);

    // Verdict: Accepted / Rejected & deflated hours
    const isDeflated = action === 'pre_approve' && (approvedHours < claimedHours || deflatedHours > 0);
    const verdictText = action === 'pre_approve'
      ? (isDeflated ? `Accepted (deflated from ${claimedHours} hrs to ${approvedHours} hrs)` : 'Accepted')
      : action === 'flag_fraud'
      ? 'Rejected (Fraud)'
      : 'Rejected';
    lines.push(`Verdict: ${verdictText}`);

    // Everything that failed (strictly what failed; no passed, no skipped)
    const failedPoints = getRejectionBulletPoints().map((pt) => pt.replace(/^[•*]\s*/, '- '));
    if (failedPoints.length > 0) {
      lines.push('');
      lines.push(...failedPoints);
    }

    // Internal Technical Audit Justification (direct text, no heading)
    if (hoursJustification.trim()) {
      lines.push('');
      lines.push(hoursJustification.trim());
    }

    return lines.join('\n');
  };

  const copyFullLedger = () => {
    const text = generateHumanReadableLedger();
    navigator.clipboard.writeText(text);
    setLedgerCopied(true);
    toast.success('Complete Review Summary copied to clipboard!');
    setTimeout(() => setLedgerCopied(false), 2500);
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
            Synthesize the technical audit across all stages, verify checklist calibration, adjust hours, and record public feedback for @<strong className="text-content-primary">{project.githubUsername}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {project.cockpitStatus === 'pending' ? (
            <button
              type="button"
              onClick={handleSubmitVerdict}
              disabled={isSubmitting}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                action === 'pre_approve'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : action === 'reject'
                  ? 'bg-rose-600 text-white hover:bg-rose-500'
                  : 'bg-amber-600 text-white hover:bg-amber-500'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording Verdict...' : 'Submit Verdict (Move to Pre-Approved)'}</span>
            </button>
          ) : project.cockpitStatus === 'pre_approved' ? (
            <button
              type="button"
              onClick={handleCompletePreApprovalAction}
              disabled={isCompleting}
              className="px-4 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleting ? 'Marking Complete...' : 'Mark as Completed Pre-Approved'}</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-lg bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46] text-xs font-mono font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Archived ({project.cockpitStatus})</span>
            </span>
          )}
        </div>
      </div>

      {/* SECTION 1: Comprehensive Interactive Review Checklist Desk */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-6 shadow-xl shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-orange" />
              <span>1. Technical Audit Checklist Calibration</span>
            </h3>
            <p className="text-[11px] text-[#a1a1aa] mt-0.5">
              Review and calibrate every requirement across all 6 audit stages. Any custom notes or specific reasons typed during the audit are displayed directly below each item.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs shrink-0">
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

        <div className="space-y-5">
          {/* Stage 1: History & Double-Dip */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                Stage 1: Submitter Track Record & History
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Halceon Cross-YSWS Ships & Archives Inspected</span>
                  <span className="text-[11px] text-[#71717a]">
                    Verified submitter track record across Arcade, High Seas, Blot, and Stardance
                  </span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Halceon"
                    status={reviewChecklist['stage1_halceon_reviewed']}
                    onPass={() => onToggleChecklist?.('stage1_halceon_reviewed', true)}
                    onFail={() => onToggleChecklist?.('stage1_halceon_reviewed', false)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Live Submissions History Audited</span>
                  <span className="text-[11px] text-[#71717a]">
                    Verified past submissions in Hack Club Live for this user
                  </span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Live History"
                    status={reviewChecklist['stage1_live_reviewed']}
                    onPass={() => onToggleChecklist?.('stage1_live_reviewed', true)}
                    onFail={() => onToggleChecklist?.('stage1_live_reviewed', false)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stage 2: Deliverables & README */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                Stage 2: Core Deliverables & Documentation
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Project Title</span>
                  <span className="text-[11px] text-[#71717a]">Descriptive, clean project name</span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Title"
                    status={reviewChecklist['shipped_name_valid']}
                    onPass={() => onToggleChecklist?.('shipped_name_valid', true)}
                    onFail={() => onToggleChecklist?.('shipped_name_valid', false)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Public Source Code Repository</span>
                  <span className="text-[11px] text-[#71717a]">Public GitHub repository exists and is accessible</span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Repo Exists"
                    status={reviewChecklist['shipped_code_valid']}
                    onPass={() => onToggleChecklist?.('shipped_code_valid', true)}
                    onFail={() => onToggleChecklist?.('shipped_code_valid', false)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Project Description</span>
                  <span className="text-[11px] text-[#71717a]">Coherent, informative description of the project</span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Description"
                    status={reviewChecklist['shipped_desc_valid']}
                    onPass={() => onToggleChecklist?.('shipped_desc_valid', true)}
                    onFail={() => onToggleChecklist?.('shipped_desc_valid', false)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Deliverable Screenshot</span>
                  <span className="text-[11px] text-[#71717a]">Attached screenshot image of the finished deliverable</span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Screenshot"
                    status={reviewChecklist['shipped_screenshot_valid']}
                    onPass={() => onToggleChecklist?.('shipped_screenshot_valid', true)}
                    onFail={() => onToggleChecklist?.('shipped_screenshot_valid', false)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-white block">README Documentation Quality</span>
                    <span className="text-[11px] text-[#71717a]">Comprehensive setup, running instructions & human authorship</span>
                  </div>
                  <div className="shrink-0">
                    <MultiOptionSelector<'pass' | 'ai_generated' | 'low_quality' | 'fail'>
                      value={currentReadmeStatus}
                      onChange={handleReadmeChange}
                      options={VERDICT_README_OPTIONS}
                      size="xs"
                    />
                  </div>
                </div>

                {reviewChecklist['note_shipped_readme'] !== undefined && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]">
                    <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
                    <input
                      type="text"
                      value={reviewChecklist['note_shipped_readme'] || ''}
                      onChange={(e) => onToggleChecklist?.('note_shipped_readme', e.target.value)}
                      placeholder="Custom reason note..."
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-0.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage 3: Playable Demo & Testing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                Stage 3: Playable Demo & Hosting
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-white block">Playable Demo & Hosting Compliance</span>
                    <span className="text-[11px] text-[#71717a]">
                      Functional live application, release binary, or video demo (disallowing ephemeral hosts)
                    </span>
                  </div>
                  <div className="shrink-0">
                    <MultiOptionSelector<'pass' | 'needs_video' | 'disallowed_host' | 'broken' | 'fail'>
                      value={currentPlayableStatus}
                      onChange={handlePlayableChange}
                      options={VERDICT_PLAYABLE_OPTIONS}
                      size="xs"
                    />
                  </div>
                </div>

                {reviewChecklist['note_shipped_playable'] !== undefined && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]">
                    <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
                    <input
                      type="text"
                      value={reviewChecklist['note_shipped_playable'] || ''}
                      onChange={(e) => onToggleChecklist?.('note_shipped_playable', e.target.value)}
                      placeholder="Custom reason note (e.g. 404, crashing, white screen)..."
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-0.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage 4: Telemetry Audit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                Stage 4: Telemetry Audit
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-white block">Hackatime Telemetry Heartbeats</span>
                    <span className="text-[11px] text-[#71717a]">Editor telemetry activity and human coding heartbeats</span>
                  </div>
                  <div className="shrink-0">
                    <MultiOptionSelector<'pass' | 'missing' | 'suspicious'>
                      value={currentTelemetryStatus}
                      onChange={handleTelemetryChange}
                      options={VERDICT_TELEMETRY_OPTIONS}
                      size="xs"
                    />
                  </div>
                </div>

                {reviewChecklist['note_telemetry_heartbeats'] !== undefined && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]">
                    <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
                    <input
                      type="text"
                      value={reviewChecklist['note_telemetry_heartbeats'] || ''}
                      onChange={(e) => onToggleChecklist?.('note_telemetry_heartbeats', e.target.value)}
                      placeholder="Custom reason note (e.g. 0 project seconds, idle time spikes)..."
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-0.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stage 5: Git Progression & AI Forensics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-brand-orange" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                  Stage 5: Git Commits Progression & AI Forensics
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18181b] text-emerald-400 border border-[#27272a]">
                {commitsSummary}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Archive vs Code Progression Verified</span>
                  <span className="text-[11px] text-[#71717a]">
                    Verified genuine new progress beyond prior archived snapshot (no duplicate resubmission)
                  </span>
                </div>
                <div className="shrink-0">
                  <PassFailControl
                    label="Progression"
                    status={reviewChecklist['stage1_double_dip_checked']}
                    onPass={() => onToggleChecklist?.('stage1_double_dip_checked', true)}
                    onFail={() => onToggleChecklist?.('stage1_double_dip_checked', false)}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-white block">Git Commits Progression & Authenticity</span>
                    <span className="text-[11px] text-[#71717a]">
                      Incremental human problem solving vs monolithic AI prompt dumps
                    </span>
                  </div>
                  <div className="shrink-0">
                    <MultiOptionSelector<'pass' | 'deflate' | 'ai_dump' | 'fail'>
                      value={currentGitStatus}
                      onChange={handleGitProgressionChange}
                      options={VERDICT_GIT_OPTIONS}
                      size="xs"
                    />
                  </div>
                </div>

                {reviewChecklist['note_git_progression'] !== undefined && (
                  <div className="flex items-center gap-2 pt-1 border-t border-[#27272a]">
                    <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">Reason / Note:</span>
                    <input
                      type="text"
                      value={reviewChecklist['note_git_progression'] || ''}
                      onChange={(e) => onToggleChecklist?.('note_git_progression', e.target.value)}
                      placeholder="Custom reason note (e.g. monolithic commit, prompt dump)..."
                      className="flex-1 bg-[#121214] border border-[#27272a] rounded px-2 py-0.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                )}
              </div>

              {/* Plagiarism & Tutorial Due Diligence in Stage 5 */}
              <div className="p-3 rounded-xl bg-[#18181b] border border-[#27272a] space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-brand-orange" />
                      <span>Plagiarism & Tutorial Search Due-Diligence</span>
                    </span>
                    <span className="text-[11px] text-[#71717a]">
                      Forensic check across Google, YouTube, and GitHub for copied tutorials or clones
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onToggleChecklist?.('plagiarism_google_cleared', !reviewChecklist['plagiarism_google_cleared'])}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                        reviewChecklist['plagiarism_google_cleared']
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#121214] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'
                      }`}
                      title="Google tutorial search completed"
                    >
                      {reviewChecklist['plagiarism_google_cleared'] ? (
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Square className="w-3 h-3 text-[#71717a]" />
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleChecklist?.('plagiarism_youtube_cleared', !reviewChecklist['plagiarism_youtube_cleared'])}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                        reviewChecklist['plagiarism_youtube_cleared']
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#121214] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'
                      }`}
                      title="YouTube walkthrough search completed"
                    >
                      {reviewChecklist['plagiarism_youtube_cleared'] ? (
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Square className="w-3 h-3 text-[#71717a]" />
                      )}
                      <span>YouTube</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleChecklist?.('plagiarism_github_cleared', !reviewChecklist['plagiarism_github_cleared'])}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                        reviewChecklist['plagiarism_github_cleared']
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#121214] border-[#27272a] text-[#71717a] hover:border-[#3f3f46]'
                      }`}
                      title="GitHub repository search completed"
                    >
                      {reviewChecklist['plagiarism_github_cleared'] ? (
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Square className="w-3 h-3 text-[#71717a]" />
                      )}
                      <span>GitHub</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyFlagged = reviewChecklist['flag_tutorial_plagiarized'] || !!reviewChecklist['note_plagiarism_match'];
                        if (isCurrentlyFlagged) {
                          onToggleChecklist?.('flag_tutorial_plagiarized', false);
                          onToggleChecklist?.('note_plagiarism_match', '');
                        } else {
                          onToggleChecklist?.('flag_tutorial_plagiarized', true);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                        reviewChecklist['flag_tutorial_plagiarized'] || reviewChecklist['note_plagiarism_match']
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-[#27272a] text-[#a1a1aa] hover:text-white hover:bg-[#3f3f46]'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{reviewChecklist['flag_tutorial_plagiarized'] || reviewChecklist['note_plagiarism_match'] ? 'Plagiarism Flagged' : 'Flag as Plagiarism'}</span>
                    </button>

                    {(reviewChecklist['flag_tutorial_plagiarized'] || reviewChecklist['note_plagiarism_match']) && (
                      <input
                        type="text"
                        value={reviewChecklist['note_plagiarism_match'] || ''}
                        onChange={(e) => {
                          onToggleChecklist?.('note_plagiarism_match', e.target.value);
                          if (!reviewChecklist['flag_tutorial_plagiarized']) {
                            onToggleChecklist?.('flag_tutorial_plagiarized', true);
                          }
                        }}
                        placeholder="Identical tutorial URL or source repo name..."
                        className="flex-1 bg-[#121214] border border-rose-500/50 rounded px-2 py-0.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-rose-400"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stage 6: Submitter Portfolio & Experience Audit */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-brand-orange" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#a1a1aa]">
                Stage 6: Submitter Experience Level Calibration
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-xs font-semibold text-white block">Submitter Technical Experience Calibration</span>
                  <span className="text-[11px] text-[#71717a]">
                    Calibrated experience level based on public GitHub portfolio, code maturity & repository history
                  </span>
                </div>
                <div className="shrink-0">
                  <MultiOptionSelector<'beginner' | 'intermediate' | 'advanced' | 'highly_experienced'>
                    value={reviewChecklist['submitter_experience_level'] || 'intermediate'}
                    onChange={(val) => onToggleChecklist?.('submitter_experience_level', val)}
                    options={VERDICT_EXPERIENCE_OPTIONS}
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Reviewer Suggestions Banners */}
      <div className="space-y-3 shrink-0">
        {/* FAILED CHECKS ALERT BANNER (If any criteria failed) */}
        {failedCount > 0 && (
          <div className="p-4 rounded-xl bg-[#18181b] border border-rose-500/50 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-rose-400 block text-sm">
                  Unmet Requirements Flagged ({failedCount} failed checks)
                </span>
                <p className="text-[#d4d4d8] leading-relaxed">
                  {failedKeys.map((k) => CHECKLIST_LABELS[k] || k).join('; ')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyFailedToJustification}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shrink-0 shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Populate Rejection Justification</span>
            </button>
          </div>
        )}

        {/* AI-GENERATED CODE FLAGGED BANNER */}
        {isAiFlagged && (
          <div className="p-4 rounded-xl bg-[#18181b] border border-purple-500/50 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <Bot className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-purple-300 block text-sm">
                  Flagged as AI-Generated Code / Prompt Dump
                </span>
                <p className="text-[#d4d4d8] leading-relaxed">
                  Reviewer marked this project as heavily AI-generated. Per YSWS guidelines, hours should be deflated or justified.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyAiDeflation}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Apply 50% AI Deflation (-{Math.round(project.submittedHours * 0.5 * 10) / 10} hrs)</span>
              </button>
            </div>
          </div>
        )}

        {/* DEFLATION RECOMMENDED BANNER */}
        {isDeflationNeeded && (
          <div className="p-4 rounded-xl bg-[#18181b] border border-amber-500/50 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-bold text-amber-300 block text-sm">
                  Hours Deflation Recommended (Git History Flagged)
                </span>
                <p className="text-[#d4d4d8] leading-relaxed">
                  Reviewer flagged git progression as requiring hours deflation (e.g. low incremental progress, excessive boilerplate, or repeated code).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleApplyDeflation}
                className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Apply Recommended Deflation (-{Math.round(project.submittedHours * 0.3 * 10) / 10} hrs)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Hours Decision */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-xl shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-brand-orange" />
          <span>2. Hours Calculation & Allocation</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#a1a1aa] block mb-1">
              Claimed Hours
            </span>
            <span className="text-2xl font-mono font-bold text-white">
              {claimedHours} <span className="text-xs font-sans font-normal text-[#a1a1aa]">hrs</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
            <label className="text-[10px] uppercase font-mono tracking-wider text-[#a1a1aa] block mb-1">
              Approved Hours
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                disabled={isReadOnly}
                value={approvedHours}
                onChange={(e) => handleApprovedHoursChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#121214] text-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-brand-orange disabled:opacity-60"
              />
              <span className="text-xs font-mono text-[#a1a1aa]">hrs</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a]">
            <label className="text-[10px] uppercase font-mono tracking-wider text-[#a1a1aa] block mb-1">
              Deflated / Deducted Hours
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                min="0"
                disabled={isReadOnly}
                value={deflatedHours}
                onChange={(e) => handleDeflatedHoursChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-[#27272a] bg-[#121214] text-xl font-mono font-bold text-[#d4d4d8] focus:outline-none focus:border-brand-orange disabled:opacity-60"
              />
              <span className="text-xs font-mono text-[#a1a1aa]">hrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Dedicated Three-Tier Feedback & Audit Commentary */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-6 shadow-xl shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border-b border-[#27272a] pb-3">
          <MessageSquare className="w-3.5 h-3.5 text-brand-orange" />
          <span>3. Feedback & Audit Commentary (3-Tier Separation)</span>
        </h3>

        {/* Box 1: Internal Technical Audit Justification (Visible to 2nd-pass reviewer & admins) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-orange" />
                <span>1. Internal Technical Audit Justification</span>
              </label>
              <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-500/40 px-2 py-0.2 rounded">
                Internal Only (2nd-Pass Reviewer & Admin Desk)
              </span>
            </div>
            {!isReadOnly && (
              <button
                type="button"
                onClick={handleAutoPopulateJustification}
                className="text-[11px] text-brand-orange hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto-Populate Justification</span>
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#a1a1aa]">
            Comprehensive technical ledger documenting audit comments, hours calculations, and progression findings. Populates with reviewer comments when auto-populate is clicked. Not visible to the submitter.
          </p>
          <textarea
            rows={5}
            readOnly={isReadOnly}
            value={hoursJustification}
            onChange={(e) => setHoursJustification(e.target.value)}
            placeholder="Technical audit justification (click Auto-Populate Justification to pull in your stage comments)..."
            className="w-full p-3.5 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#d4d4d8] font-mono focus:outline-none focus:border-brand-orange leading-relaxed disabled:opacity-60"
          />
        </div>

        {/* Box 2: Public Submitter Feedback (Visible to Submitter) */}
        <div className="space-y-2 pt-3 border-t border-[#27272a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Public Submitter Feedback</span>
              </label>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.2 rounded">
                Visible to Submitter
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAutoPopulateFeedback}
                  className="text-[11px] text-brand-orange hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Auto-Populate Feedback</span>
                </button>
              )}
              <button
                type="button"
                onClick={copyPublicFeedback}
                className="text-[11px] text-brand-orange hover:underline inline-flex items-center gap-1 font-medium cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Public Feedback</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#a1a1aa]">
            This message is sent directly to the student on Slack or email upon decision. Explain requirements clearly, constructively, and empathetically.
          </p>
          <textarea
            rows={4}
            readOnly={isReadOnly}
            value={publicFeedback}
            onChange={(e) => setPublicFeedback(e.target.value)}
            placeholder="Feedback message to the submitter (click Auto-Populate Feedback to pull in your stage comments)..."
            className="w-full p-3.5 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#d4d4d8] focus:outline-none focus:border-brand-orange leading-relaxed"
          />
        </div>

        {/* Box 3: Internal Review Notes & Quick Tags (Reviewer Scratchpad & Side Panel) */}
        <div className="space-y-2.5 pt-3 border-t border-[#27272a]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Internal Review Notes & Quick Tags</span>
              </label>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.2 rounded">
                Private Reviewer Desk & Side Panel
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#a1a1aa]">
            Private commentary stored in Cockpit database for fellow reviewers and side panel scratchpad. Never displayed to the submitter.
          </p>

          {/* Quick Tag Chips */}
          {!isReadOnly && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-mono text-[#71717a] flex items-center gap-1">
                <Tag className="w-3 h-3 text-brand-orange" />
                <span>Quick Tags:</span>
              </span>
              {[
                '⚡ High Velocity Flag',
                '🤖 AI Code Dump Pattern',
                '📁 Purged Code Found',
                '🔎 Plagiarism Checked',
                '⚠️ Needs Video Proof',
                '🔒 Double-Dip Flagged',
                '✅ Genuine Iterative Commits',
                '🎨 Clean Shipped Demo',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTagToNotes(tag)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-brand-orange hover:bg-brand-orange/10 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={3}
            readOnly={isReadOnly}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Private technical notes, flags, suspicious patterns, or reminders for fellow reviewers..."
            className="w-full p-3.5 rounded-xl border border-[#27272a] bg-[#18181b] text-xs text-[#d4d4d8] focus:outline-none focus:border-brand-orange leading-relaxed"
          />
        </div>
      </div>

      {/* SECTION 4: Decision Action Card & Confirmation */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-5 shadow-xl shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white">
          4. Decision Action & Finalization
        </h3>

        {/* Action Toggle Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) return;
              setAction('pre_approve');
              if (approvedHours === 0) setApprovedHours(project.submittedHours);
            }}
            className={`p-4 rounded-xl border text-left transition-all ${
              isReadOnly ? 'opacity-80 cursor-default' : 'cursor-pointer'
            } ${
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
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) return;
              setAction('reject');
              setApprovedHours(0);
            }}
            className={`p-4 rounded-xl border text-left transition-all ${
              isReadOnly ? 'opacity-80 cursor-default' : 'cursor-pointer'
            } ${
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
            disabled={isReadOnly}
            onClick={() => {
              if (isReadOnly) return;
              setAction('flag_fraud');
              setApprovedHours(0);
            }}
            className={`p-4 rounded-xl border text-left transition-all ${
              isReadOnly ? 'opacity-80 cursor-default' : 'cursor-pointer'
            } ${
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

        {/* Submit or Complete Button */}
        <div className="pt-2 flex items-center justify-between border-t border-[#27272a]">
          <div className="text-xs text-[#a1a1aa] font-mono">
            {project.cockpitStatus === 'pending' ? (
              action === 'pre_approve' ? (
                <span className="text-emerald-400 font-semibold">
                  ● Ready to pre-approve {approvedHours} hours (Moves to Pre-Approved Queue)
                </span>
              ) : action === 'reject' ? (
                <span className="text-rose-400 font-semibold">
                  ● Ready to flag for rejection (0 hrs granted — Moves to Pre-Approved Queue)
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">
                  ● Ready to flag fraud for administrative audit (Moves to Pre-Approved Queue)
                </span>
              )
            ) : project.cockpitStatus === 'pre_approved' ? (
              <span className="text-emerald-400 font-semibold">
                ● Pre-Approval Review Complete — Ready to mark as Completed Pre-Approved
              </span>
            ) : (
              <span className="text-[#a1a1aa]">
                ● Project is archived in {project.cockpitStatus} queue (Read-Only)
              </span>
            )}
          </div>

          {project.cockpitStatus === 'pending' ? (
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
                  ? 'Recording Verdict...'
                  : action === 'pre_approve'
                  ? `Confirm Pre-Approval (${approvedHours} hrs)`
                  : action === 'reject'
                  ? 'Confirm Rejection Flag'
                  : 'Confirm Fraud Flag'}
              </span>
            </button>
          ) : project.cockpitStatus === 'pre_approved' ? (
            <button
              type="button"
              onClick={handleCompletePreApprovalAction}
              disabled={isCompleting}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isCompleting
                  ? 'Marking Complete...'
                  : 'Mark as Completed Pre-Approved & Advance'}
              </span>
            </button>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46] text-xs font-mono font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Archived ({project.cockpitStatus})</span>
            </span>
          )}
        </div>
      </div>

      {/* SECTION 5: Permanent Dispatch Ledger & Clipboard Export */}
      <div className="p-6 rounded-2xl bg-[#121214] border border-[#27272a] text-white space-y-4 shadow-xl shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-brand-orange" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Permanent Review Summary & Dispatch Ledger
            </h3>
          </div>
          <button
            type="button"
            onClick={copyFullLedger}
            className="px-4 py-2 rounded-xl bg-brand-orange text-white hover:bg-brand-orange/90 font-bold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            {ledgerCopied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
            <span>{ledgerCopied ? 'Copied to Clipboard!' : 'Copy Complete Review Summary to Clipboard'}</span>
          </button>
        </div>
        <p className="text-[11px] text-[#a1a1aa]">
          Human-readable ledger containing project identity, Hackatime ID, all checklist decisions, internal justification, public submitter feedback, and reviewer notes. Always available for 1-click dispatch to Slack or external airtables.
        </p>
        <div className="relative">
          <pre className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] text-[11px] font-mono text-[#a1a1aa] whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto leading-relaxed select-all">
            {generateHumanReadableLedger()}
          </pre>
        </div>
      </div>
    </div>
  );
};
